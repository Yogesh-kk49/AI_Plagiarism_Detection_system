import axios from "axios";

const API = axios.create({
  baseURL:"http://localhost:8000/api",
  withCredentials: true, // ⭐ VERY IMPORTANT for Django session
});

export default API;
