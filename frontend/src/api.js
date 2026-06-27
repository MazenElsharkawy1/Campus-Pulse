import axios from 'axios';

// هنا بنسحب الرابط من ملف الـ .env
const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // الهيدر ده ضروري جداً عشان يتخطى صفحة تحذير ngrok
    'ngrok-skip-browser-warning': '69420' 
  }
});

export default api;