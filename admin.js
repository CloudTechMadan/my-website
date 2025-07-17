// === Auth Check and Redirection ===
function isTokenExpired(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const exp = payload.exp * 1000; // to milliseconds
    return Date.now() > exp;
  } catch {
    return true;
  }
}

const accessToken = localStorage.getItem("access_token");
const idToken = localStorage.getItem("id_token");

if (!accessToken || isTokenExpired(accessToken)) {
  localStorage.clear();
  window.location.href = "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/login?client_id=5r9fdn5ja386taccaljn7qdlm7&response_type=code&scope=email+openid&redirect_uri=https://cloudtechmadan.github.io/my-website/index.html";
}

// === Display Logged-in User Info ===
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

// === Handle Add User Form Submission ===
document.getElementById("addUserForm").addEventListener("submit", async function (e) {
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
  const reader = new FileReader();

  reader.onload = async function () {
    const base64Image = reader.result.split(',')[1];

    try {
      const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken
        },
        body: JSON.stringify({
          employeeId,
          name,
          image: base64Image
        })
      });

      const result = await response.json();
      if (response.ok) {
        status.textContent = "✅ User added successfully!";
        document.getElementById("addUserForm").reset();
      } else {
        status.textContent = `❌ Error: ${result.message || "Something went wrong"}`;
      }
    } catch (err) {
      console.error("Add user error:", err);
      status.textContent = "❌ Failed to add user.";
    }
  };

  reader.readAsDataURL(file);
});

// === Logout Handler ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/logout?client_id=5r9fdn5ja386taccaljn7qdlm7&logout_uri=https://cloudtechmadan.github.io/my-website/index.html";
});
