const clientId = '5r9fdn5ja386taccaljn7qdlm7'; // Your App Client ID
const domain = 'face-attendance-admin-auth.auth.us-east-1.amazoncognito.com';
const redirectUri = 'http://localhost:5500/admin.html'; // Change if hosted elsewhere
const tokenEndpoint = `https://${domain}/oauth2/token`;
const addUserApi = 'https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser';

let idToken = null;

// Step 1: Check if redirected back with ?code=
(async function checkLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    // Step 2: Exchange code for token
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri
    });

    try {
      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const tokenData = await res.json();
      idToken = tokenData.id_token;

      if (!idToken) {
        document.getElementById('adminStatus').textContent = '❌ Failed to retrieve token.';
        return;
      }

      localStorage.setItem('idToken', idToken);
      // Remove ?code= from URL
      window.history.replaceState({}, document.title, redirectUri);

    } catch (err) {
      document.getElementById('adminStatus').textContent = '❌ Error during login.';
    }
  } else {
    // No token in URL — check localStorage
    idToken = localStorage.getItem('idToken');
    if (!idToken) {
      // Redirect to Cognito login
      const loginUrl = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
      window.location.href = loginUrl;
    }
  }
})();

// Step 3: Handle form submission securely
document.getElementById("addUserForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("fullName").value.trim();
  const fileInput = document.getElementById("faceImage");
  const status = document.getElementById("adminStatus");

  if (!fileInput.files.length) {
    status.textContent = "Please select an image file.";
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];

    const payload = {
      employeeId,
      name,
      imageData: base64Data
    };

    try {
      const response = await fetch(addUserApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        status.textContent = `✅ ${result.message || "User added and indexed successfully."}`;
      } else {
        status.textContent = `❌ ${result.error || "Something went wrong."}`;
      }
    } catch (err) {
      console.error("Error:", err);
      status.textContent = "❌ Failed to connect to backend.";
    }
  };

  reader.readAsDataURL(file);
});

// Logout function
function logout() {
  localStorage.removeItem('idToken');
  window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}
