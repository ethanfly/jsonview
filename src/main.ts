import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles.css';

// 预初始化主题，避免闪烁
const THEME_KEY = 'jsonview.theme';
const storedTheme = window.localStorage.getItem(THEME_KEY) || 'dark';
document.documentElement.dataset.theme = storedTheme;

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// 挂载后隐藏骨架屏
app.mount('#app');

// 移除骨架屏
requestAnimationFrame(() => {
  const skeleton = document.getElementById('skeleton');
  if (skeleton) {
    skeleton.classList.add('hidden');
    setTimeout(() => skeleton.remove(), 300);
  }
});

