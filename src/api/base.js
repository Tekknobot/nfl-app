export const API_BASE =
  process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim() !== ""
    ? process.env.REACT_APP_API_BASE.replace(/\/+$/, "")
    : ""; // CRA dev proxy
