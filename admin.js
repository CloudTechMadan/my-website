// === Check if token is expired ===
function isTokenExpired(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    return Date.now() > payload.exp * 1000;
  } catch {
    return true;
  }
}

// === Get tokens ===
const accessToken = localStorage.getItem("access_token");
const idToken = localStorage.getItem("id_token");

// === Redirect to login if invalid ===
if (!accessToken || isTokenExpired(accessToken)) {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/login?client_id=5r9fdn5ja386taccaljn7qdlm7&response_type=code&scope=email+openid&redirect_uri=https://cloudtechmadan.github.io/my-website/index.html";
}

// === Show logged-in user ===
function showUserInfo(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const email = payload.email || payload["cognito:username"] || "Unknown user";
    document.getElementById("userInfo").innerHTML = `👤 Logged in as <strong>${email}</strong>`;
  } catch {
    document.getElementById("userInfo").textContent = "Logged in";
  }
}
showUserInfo(idToken);

// === Handle form submission ===
document.getElementById("addUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const employeeId = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("fullName").value.trim();
  const fileInput = document.getElementById("faceImage");
  const status = document.getElementById("adminStatus");

  if (!fileInput.files.length) {
    status.textContent = "❌ Please upload an image.";
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 2 * 1024 * 1024) {
    status.textContent = "❌ Image too large. Max 2MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Image = reader.result.split(',')[1];
    if (!base64Image) {
      status.textContent = "❌ Failed to read image.";
      return;
    }

    try {
      status.textContent = "⏳ Uploading...";
      const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ employeeId, name, image: base64Image }),
      });

      const result = await response.json();
      if (response.ok) {
        status.textContent = "✅ User added successfully!";
        document.getElementById("addUserForm").reset();
      } else {
        status.textContent = `❌ ${result.message || result.error || "API Error"}`;
      }
    } catch (err) {
      console.error("Add user error:", err);
      status.textContent = "❌ Failed to add user.";
    }
  };

  reader.readAsDataURL(file);
});

// === Logout ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/logout?client_id=5r9fdn5ja386taccaljn7qdlm7&logout_uri=https://cloudtechmadan.github.io/my-website/index.html";
});
