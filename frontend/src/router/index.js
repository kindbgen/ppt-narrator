import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Editor from '../views/Editor.vue'
import Presenter from '../views/Presenter.vue'
import Narrator from '../views/Narrator.vue'
import AllProjects from '../views/AllProjects.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/editor',
    name: 'Editor',
    component: Editor
  },
  {
    path: '/presenter',
    name: 'Presenter',
    component: Presenter
  },
  {
    path: '/narrator',
    name: 'Narrator',
    component: Narrator
  },
  {
    path: '/all-projects',
    name: 'AllProjects',
    component: AllProjects
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router