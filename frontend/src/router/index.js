import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Editor from '../views/Editor.vue'
import Presenter from '../views/Presenter.vue'
import Narrator from '../views/Narrator.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router