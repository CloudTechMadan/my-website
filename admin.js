// ==== CONFIG ====
const apiUrl         = 'https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser';
const cognitoDomain  = 'face-attendance-admin-auth.auth.us-east-1.amazoncognito.com';
const clientId       = '5r9fdn5ja386taccaljn7qdlm7';
const redirectUri    = 'https://cloudtechmadan.github.io/my-website/index.html';
// =================

// ======= Step 1: Handle token exchange from "code" =======
(async function handleAuthCodeExchange() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code && !localStorage.getItem("access_token")) {
    const form = new URLSearchParams();
    form.append("grant_type", "authorization_code");
    form.append("client_id", clientId);
    form.append("code", code);
    form.append("redirect_uri", redirectUri);

    try {
      const response = await fetch(`https://${cognitoDomain}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form
      });

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("id_token", data.id_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        // Remove ?code= from URL
        window.history.replaceState({}, document.title, redirectUri);
      } else {
        console.error("Token error", data);
        document.getElementById("adminStatus").textContent = "❌ Failed to retrieve token.";
      }
    } catch (err) {
      console.error("Token exchange failed:", err);
      document.getElementById("adminStatus").textContent = "❌ Network error during token exchange.";
    }
  }
})();

// ======= Step 2: Display logged-in user info =======
function parseJwt (token) {
  const payload = token.split('.')[1];
  const json    = atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
  return JSON.parse(json);
}

(function showUserInfo(){
  const idToken = localStorage.getItem('id_token');
  if (!idToken) return;

  try {
    const claims   = parseJwt(idToken);
    const email    = claims.email || 'unknown';
    const username = claims['cognito:username'] || email;
    document.getElementById('userInfo').textContent =
      `👤 Logged in as ${username} (${email})`;
  } catch (e) {
    console.warn('Cannot parse id_token', e);
  }
})();

// ======= Step 3: Add User Submit Form =======
document.getElementById("addUserForm").addEventListener("submit", async (e)=>{
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name       = document.getElementById("fullName").value.trim();
  const fileInput  = document.getElementById("faceImage");
  const status     = document.getElementById("adminStatus");
  const token      = localStorage.getItem("access_token");

  if (!token){ status.textContent = "❌ Not authenticated."; return; }
  if (!fileInput.files.length){ status.textContent = "Please select an image."; return; }

  const reader = new FileReader();
  reader.onloadend = async ()=> {
    const base64Data = reader.result.split(',')[1];
    const payload    = { employeeId, name, imageData: base64Data };

    try {
      const res = await fetch(apiUrl,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`
        },
        body:JSON.stringify(payload)
      });
      const out = await res.json();
      status.textContent = res.ok
        ? `✅ ${out.message || 'User added.'}`
        : `❌ ${out.error   || 'Error.'}`;
    } catch(err){
      console.error(err);
      status.textContent = "❌ Network error.";
    }
  };
  reader.readAsDataURL(fileInput.files[0]);
});

// ======= Step 4: Logout Button =======
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  localStorage.removeItem('access_token');
  localStorage.removeItem('id_token');
  localStorage.removeItem('refresh_token');

  const logoutUrl =
    `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(redirectUri)}`;

  window.location.href = logoutUrl;
});
