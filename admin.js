const clientId = '5r9fdn5ja386taccaljn7qdlm7'; // Your Cognito App Client ID
const domain = 'face-attendance-admin-auth.auth.us-east-1.amazoncognito.com';
const redirectUri = 'https://your-username.github.io/your-repo/'; // 👈 Replace with your actual GitHub Pages URL
const tokenEndpoint = `https://${domain}/oauth2/token`;
const addUserApi = 'https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser';

let idToken = null;

// Step 1: Check if token already stored
(async function () {
  const savedToken = localStorage.getItem('idToken');
  const code = sessionStorage.getItem('authCode');

  if (savedToken) {
    idToken = savedToken;
    return;
  }

  if (code) {
    // Exchange code for token
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
      sessionStorage.removeItem('authCode'); // Clear code after use

    } catch (err) {
      document.getElementById('adminStatus').textContent = '❌ Error during login.';
      console.error(err);
    }
  } else {
    // Not logged in – redirect to Cognito
    const loginUrl = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    window.location.href = loginUrl;
  }
})();

// Step 2: Submit form with token
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
  sessionStorage.clear();
  window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}
