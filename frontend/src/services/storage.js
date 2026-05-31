/**
 * SQLite 本地存储服务
 * 使用 sql.js (SQLite via WebAssembly) + IndexedDB 持久化
 */

import initSqlJs from 'sql.js'
import { get, set } from 'idb-keyval'

const DB_KEY = 'ppt-narrator-db'

let db = null

const WASM_URL = '/sql-wasm.wasm'

// ============ Safe value ============

function S(v, fb = null) {
  return (v === undefined || v === null) ? fb : v
}

// ============ Init ============

export async function initDB() {
  const wasmResponse = await fetch(WASM_URL)
  const wasmBinary = await wasmResponse.arrayBuffer()
  const SQL = await initSqlJs({ wasmBinary })

  try {
    const saved = await get(DB_KEY)
    if (saved) {
      db = new SQL.Database(saved instanceof Uint8Array ? saved : new Uint8Array(saved))
    } else {
      db = new SQL.Database()
      _createTables()
      await _persist()
    }
  } catch {
    db = new SQL.Database()
    _createTables()
    await _persist()
  }

  return db
}

function _createTables() {
  db.run('CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT \'未命名项目\', speaker TEXT DEFAULT \'\', template_style TEXT DEFAULT \'business\', ai_provider TEXT DEFAULT \'gateway\', raw_content TEXT DEFAULT \'\', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)')
  db.run('CREATE TABLE IF NOT EXISTS slides (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, page_index INTEGER NOT NULL, title TEXT DEFAULT \'\', content TEXT DEFAULT \'\', layout TEXT DEFAULT \'content\', duration INTEGER DEFAULT 120, narration TEXT DEFAULT \'\', keywords TEXT DEFAULT \'[]\', tips TEXT DEFAULT \'[]\', key_points TEXT DEFAULT \'[]\', subtitle TEXT DEFAULT \'\', author TEXT DEFAULT \'\', number TEXT DEFAULT \'\', quote TEXT DEFAULT \'\')')
  db.run('PRAGMA foreign_keys = ON')
}

async function _persist() {
  if (!db) return
  const data = db.export()
  await set(DB_KEY, new Uint8Array(data))
}

// ============ Projects CRUD ============

export async function createProject({ slides, meta = {} }) {
  if (!db) await initDB()

  const now = new Date().toISOString()

  try {
    db.run(
      'INSERT INTO projects (title, speaker, template_style, ai_provider, raw_content, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      [S(meta.title,'未命名项目'), S(meta.speaker,''), S(meta.templateStyle,'business'), S(meta.aiProvider,'gateway'), S(meta.rawContent,''), now, now]
    )
    // Use exec to get last insert id (more reliable than run().lastInsertRowid)
    const idResult = db.exec('SELECT last_insert_rowid() AS id')
    const pid = idResult[0].values[0][0]
    console.log('[Storage] Project created with id:', pid)

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]
      try {
        db.run(
          'INSERT INTO slides (project_id,page_index,title,content,layout,duration,narration,keywords,tips,key_points,subtitle,author,number,quote) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [pid, i, S(s.title,''), S(s.content,''), S(s.layout,'content'), S(s.duration,120), S(s.narration,''), JSON.stringify(S(s.keywords,[])), JSON.stringify(S(s.tips,[])), JSON.stringify(S(s.keyPoints,[])), S(s.subtitle,''), S(s.author,''), S(s.number,''), S(s.quote,'')]
        )
      } catch (e) {
        console.error('[Storage] Slide insert error at index', i, 'slide:', JSON.stringify(s).slice(0, 200), e)
        throw e
      }
    }

    await _persist()
    return pid
  } catch (e) {
    console.error('[Storage] createProject error:', e)
    throw e
  }
}

export async function getProjectList() {
  if (!db) await initDB()
  const result = db.exec('SELECT id,title,speaker,template_style,ai_provider,created_at,updated_at,(SELECT COUNT(*) FROM slides WHERE project_id=projects.id) AS slide_count FROM projects ORDER BY updated_at DESC')
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => { const o = {}; columns.forEach((c,i) => o[c]=row[i]); return o })
}

export async function getProject(id) {
  if (!db) await initDB()
  const pr = db.exec('SELECT * FROM projects WHERE id = ?', [id])
  if (!pr.length || !pr[0].values.length) return null
  const { columns: pc, values: pv } = pr[0]
  const proj = {}; pc.forEach((c,i) => proj[c]=pv[0][i])
  const sr = db.exec('SELECT * FROM slides WHERE project_id = ? ORDER BY page_index ASC', [id])
  const slides = []
  if (sr.length && sr[0].values.length) {
    const { columns: sc, values: sv } = sr[0]
    for (const row of sv) {
      const s = {}; sc.forEach((c,i) => s[c]=row[i])
      try { s.keywords = JSON.parse(s.keywords) } catch { s.keywords = [] }
      try { s.tips = JSON.parse(s.tips) } catch { s.tips = [] }
      try { s.keyPoints = JSON.parse(s.key_points) } catch { s.keyPoints = [] }
      s.pageIndex = s.page_index
      slides.push(s)
    }
  }
  return { ...proj, slides }
}

export async function updateProjectMeta(id, { title, speaker }) {
  if (!db) await initDB()
  const now = new Date().toISOString()
  try {
    db.run('UPDATE projects SET title=?, speaker=?, updated_at=? WHERE id=?', [S(title,'未命名项目'), S(speaker,''), now, id])
  } catch (e) {
    console.error('[Storage] updateProjectMeta error:', e)
    throw e
  }
  await _persist()
}

export async function updateSlide(projectId, pageIndex, fields) {
  if (!db) await initDB()
  const now = new Date().toISOString()
  try {
    db.run('UPDATE projects SET updated_at=? WHERE id=?', [now, projectId])
  } catch (e) {
    console.error('[Storage] updateSlide(projects) error:', e)
    throw e
  }
  const sets = [], vals = []
  const add = (col, v, fb) => { if (v != null) { sets.push(col+'=?'); vals.push(S(v,fb)) } }
  add('narration', fields.narration, '')
  add('title', fields.title, '')
  add('content', fields.content, '')
  add('duration', fields.duration, 120)
  if (fields.keywords != null) { sets.push('keywords=?'); vals.push(JSON.stringify(S(fields.keywords,[]))) }
  if (fields.tips != null) { sets.push('tips=?'); vals.push(JSON.stringify(S(fields.tips,[]))) }
  if (fields.keyPoints != null) { sets.push('key_points=?'); vals.push(JSON.stringify(S(fields.keyPoints,[]))) }
  if (sets.length === 0) return
  vals.push(projectId, pageIndex)
  try {
    db.run(`UPDATE slides SET ${sets.join(',')} WHERE project_id=? AND page_index=?`, vals)
  } catch (e) {
    console.error('[Storage] updateSlide(slides) error:', e)
    throw e
  }
  await _persist()
}

export async function deleteProject(id) {
  if (!db) await initDB()
  db.run('PRAGMA foreign_keys = ON')
  db.run('DELETE FROM projects WHERE id = ?', [id])
  await _persist()
}

export async function updateProjectSlides(projectId, slides) {
  if (!db) await initDB()
  const now = new Date().toISOString()
  try {
    db.run('UPDATE projects SET updated_at=? WHERE id=?', [now, projectId])
  } catch (e) {
    console.error('[Storage] updateProjectSlides(projects) error:', e)
    throw e
  }
  try {
    db.run('DELETE FROM slides WHERE project_id=?', [projectId])
  } catch (e) {
    console.error('[Storage] updateProjectSlides(delete) error:', e)
    throw e
  }
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i]
    try {
      db.run(
        'INSERT INTO slides (project_id,page_index,title,content,layout,duration,narration,keywords,tips,key_points,subtitle,author,number,quote) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [projectId, i, S(s.title,''), S(s.content,''), S(s.layout,'content'), S(s.duration,120), S(s.narration,''), JSON.stringify(S(s.keywords,[])), JSON.stringify(S(s.tips,[])), JSON.stringify(S(s.keyPoints,[])), S(s.subtitle,''), S(s.author,''), S(s.number,''), S(s.quote,'')]
      )
    } catch (e) {
      console.error('[Storage] updateProjectSlides insert error at', i, 'slide:', JSON.stringify(s).slice(0,200), e)
      throw e
    }
  }
  await _persist()
}
