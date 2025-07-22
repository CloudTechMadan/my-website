function isTokenExpired(token) {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
  } catch {
    return true;
  }
}

const accessToken = localStorage.getItem("access_token");
const idToken = localStorage.getItem("id_token");

if (!accessToken || isTokenExpired(accessToken)) {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/login?client_id=64pn554o9iae8at36o356j1ba1&response_type=token&scope=openid+email+profile+admin-api/admin-access&redirect_uri=https://cloudtechmadan.github.io/my-website/index.html";
}

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

  if (file.size > 2 * 1024 * 1024) {
    status.textContent = "❌ Image too large. Max 2MB.";
    return;
  }

  const reader = new FileReader();

  reader.onload = async function () {
    if (!reader.result.includes(',')) {
      status.textContent = "❌ Failed to read image.";
      return;
    }

    const base64Image = reader.result.split(',')[1];

    try {
      status.textContent = "⏳ Uploading...";
      const response = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/addUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
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
        status.textContent = `❌ Error: ${result.error || result.message || "Something went wrong"}`;
      }
    } catch (err) {
      console.error("Add user error:", err);
      status.textContent = "❌ Failed to add user.";
    }
  };

  reader.readAsDataURL(file);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href =
    "https://face-attendance-admin-auth.auth.us-east-1.amazoncognito.com/logout?client_id=64pn554o9iae8at36o356j1ba1&logout_uri=https://cloudtechmadan.github.io/my-website/index.html";
});

//Loading Logs with details
async function loadEmployees(filterId = null) {
  const status = document.getElementById("adminStatus");
  const logsContainer = document.getElementById("logsContainer");
  const logsHeader = document.getElementById("logsHeader");
  const logsTableBody = document.querySelector("#logsTable tbody");

  try {
    // If filterId is passed, request with query param to also get logs
    const url = filterId
      ? `https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin?employeeId=${encodeURIComponent(filterId)}`
      : `https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/getEmployeeDetailsAdmin`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = `❌ Failed to load employees: ${data.error}`;
      return;
    }

    // 🧑‍💼 Render employee table
    const tableBody = document.querySelector("#employeeTable tbody");
    tableBody.innerHTML = "";
    data.employees.forEach(emp => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${emp.EmployeeID}</td>
        <td>${emp.Name}</td>
        <td>${emp.FaceId || '—'}</td>
        <td>${emp.CreatedAt || '—'}</td>
        <td>
          <button class="editBtn" data-id="${emp.EmployeeID}" data-name="${emp.Name}">✏️ Edit</button>
          <button class="delete-btn" data-id="${emp.EmployeeID}" style="margin-left: 5px;">🗑️ Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    attachEditButtons();
    attachDeleteButtons();

    // 📜 If logs are returned, show them
    if (data.logs && data.logs.length > 0) {
      logsHeader.style.display = "block";
      logsContainer.style.display = "block";
      logsTableBody.innerHTML = "";

      data.logs.forEach(log => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${log.TimestampIST || "—"}</td>
          <td>${log.Timestamp || "—"}</td>
          <td>${log.Address || "—"}</td>
          <td>${log.Pincode || "—"}</td>
        `;
        logsTableBody.appendChild(row);
      });
    } else {
      logsHeader.style.display = "none";
      logsContainer.style.display = "none";
      logsTableBody.innerHTML = "";
    }

  } catch (err) {
    console.error("Load employees error:", err);
    status.textContent = "❌ Unable to fetch employees.";
  }
}


loadEmployees(); // Load on page load

// Enhanced Search and Clear Logic
document.querySelector('button[onclick="searchEmployee()"]').addEventListener("click", function () {
  const filter = document.getElementById("searchInput").value.toLowerCase().trim();
  const rows = document.querySelectorAll("#employeeTable tbody tr");

  let found = false;
  let matchedId = "";

  rows.forEach(row => {
    const employeeId = row.children[0].textContent.toLowerCase();
    const name = row.children[1].textContent.toLowerCase();
    const isMatch = employeeId.includes(filter) || name.includes(filter);

    if (isMatch && !found) {
      matchedId = row.children[0].textContent;
      found = true;
    }

    row.style.display = isMatch ? "" : "none";

    // Highlight matched text
    Array.from(row.children).forEach(cell => {
      const original = cell.textContent;
      if (!filter) {
        cell.innerHTML = original;
      } else {
        const regex = new RegExp(`(${filter})`, "gi");
        cell.innerHTML = original.replace(regex, "<mark>$1</mark>");
      }
    });
  });

  if (found) {
  loadEmployees(matchedId); // ✅ Will fetch both employee and logs data
} else {
  document.getElementById("logsHeader").style.display = "none";
  document.getElementById("logsContainer").style.display = "none";
}
});

document.querySelector('button[onclick="clearSearch()"]').addEventListener("click", function () {
  document.getElementById("searchInput").value = "";
  const rows = document.querySelectorAll("#employeeTable tbody tr");

  rows.forEach(row => {
    row.style.display = "";
    Array.from(row.children).forEach(cell => {
      cell.innerHTML = cell.textContent; // Remove highlights
    });
  });

  document.getElementById("logsHeader").style.display = "none";
  document.getElementById("logsContainer").style.display = "none";

  // Optionally reload logs or just reset view
  loadEmployees(); // Only needed if you dynamically load the table
});


function attachEditButtons() {
  const buttons = document.querySelectorAll(".editBtn");
  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const empId = btn.dataset.id;
      const currentName = btn.dataset.name;
      const newName = prompt(`Enter new name for Employee ID ${empId}:`, currentName);
      if (!newName || newName.trim() === "") return;

      try {
        const res = await fetch("https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/updateEmployeeNameAdmin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ employeeId: empId, name: newName.trim() })
        });

        const result = await res.json();
        if (res.ok) {
          alert("✅ Name updated successfully.");
          loadEmployees(); // reload
        } else {
          alert(`❌ Error: ${result.error || "Update failed"}`);
        }
      } catch (err) {
        alert("❌ Network error.");
        console.error(err);
      }
    });
  });
}

function attachDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.delete-btn');

  deleteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const employeeId = button.dataset.id;

      const userInput = prompt(`To confirm deletion, type the Employee ID: "${employeeId}"`);

      if (userInput !== employeeId) {
        alert("❌ Employee ID did not match. Deletion cancelled.");
        return;
      }

      try {
        const token = localStorage.getItem("access_token"); // Or wherever you're storing it

        const response = await fetch('https://jprbceq0dk.execute-api.us-east-1.amazonaws.com/deleteEmployeeAdmin', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            employeeId: employeeId,
            confirmId: userInput // 🔐 Match confirmation
            })
        });

        const result = await response.json();

        if (response.ok) {
          alert(`✅ ${result.message}`);
          button.closest('tr').remove(); // Remove row from table
        } else {
          alert(`❌ ${result.error || 'Delete failed'}`);
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("❌ Failed to delete employee.");
      }
    });
  });
}


