import axios from "axios";
import { BASE_URL } from "../config";

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // ⭐ VERY IMPORTANT for Django session
});

export default API;