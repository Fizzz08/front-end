// config.js - Base URL Configuration
const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000/"  // Local Development
    : "https://chikithsa.netlify.app/"; // Netlify Deployment

export default BASE_URL;
