// Constants
const apiBaseUrl = 'http://localhost:8080/api/v1/doctor';
const token = localStorage.getItem('token');

// DOM Elements
const tableBody = document.getElementById('tableBody');
const fromSpan = document.getElementById('from');
const toSpan = document.getElementById('to');
const totalEntriesSpan = document.getElementById('totalTableEntries');
const pageNumbersDiv = document.getElementById('pageNumbers');
const pageNumberInput = document.getElementById('pageNumberInput');
const goToPageButton = document.getElementById('goToPageButton');

let doctors = [];
let currentPage = 1;
const rowsPerPage = 7;

// Fetch all doctors
async function fetchDoctors() {
    if (!token) {
        alert('Unauthorized access. Please log in again.');
        window.location.href = 'http://localhost:3000/myPage/HTML/login.html';
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/getAll`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch doctors');

        doctors = await response.json();
        updatePagination();
        renderTable();
    } catch (err) {
        console.error('Error fetching doctors:', err);
        alert('Error fetching doctor data.');
    }
}

// Render table
function renderTable() {
    tableBody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, doctors.length);

    doctors.slice(start, end).forEach(doctor => {
        const row = document.createElement('tr');
        row.setAttribute('id', `row-${doctor.id}`);

        // Inside renderTable function, update data-field attributes to snake_case
        row.innerHTML = `
        <td>${doctor.id}</td>
        <td><span class="editable" data-field="name">${doctor.name}</span></td>
        <td><span class="editable" data-field="specialization">${doctor.specialization}</span></td>
        <td><span class="editable" data-field="location">${doctor.location}</span></td>
        <td class="centered-column"><span class="editable" data-field="yearOfExp">${doctor.yearOfExp}</span></td>
        <td ><span class="editable" data-field="availableDays">${doctor.availableDays}</span></td>
        <td><span class="editable" data-field="fees">${doctor.fees}</span></td>
        <td><span class="editable" data-field="availableTime">${doctor.availableTime}</span></td>

        <td>
            <div class="c1">
            <button id="editBtn-${doctor.id}" class="edit-btn" onclick="editDoctor('${doctor.id}')">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="delete-btn" onclick="deleteDoctor('${doctor.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
            </div>

        </td>
        `;
        tableBody.appendChild(row);
    });

    fromSpan.innerText = start + 1;
    toSpan.innerText = end;
    updatePagination();
}

function editDoctor(id) {
    const row = document.getElementById(`row-${id}`);
    const editButton = document.getElementById(`editBtn-${id}`);
    const icon = editButton.querySelector("i");

    if (!row || !editButton || !icon) return;

    // Check current mode using a custom data attribute
    if (editButton.getAttribute("data-mode") !== "editing") {
        // Switch to edit mode
        row.querySelectorAll('.editable').forEach(span => {
            const value = span.innerText;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.setAttribute('data-field', span.getAttribute('data-field'));
            span.replaceWith(input);
        });

        editButton.setAttribute("data-mode", "editing");
        icon.className = "fa-solid fa-check"; // ✅ Change icon to checkmark
    } else {
        saveDoctor(id); // Call save function when clicked again
    }
}


function showAddDoctorForm() {
    document.getElementById('addDoctorContainer').style.display = 'block';
}

function closeAddDoctor() {
    document.getElementById('addDoctorContainer').style.display = 'none';
}


async function addDoctor() {
    const newDoctor = {
        name: document.getElementById('name').value.trim(),
        specialization: document.getElementById('specialization').value.trim(),
        location: document.getElementById('location').value.trim(),
        yearOfExp: parseInt(document.getElementById('yearOfExp').value),
        availableDays: document.getElementById('availableDays').value.trim(),
        fees: parseFloat(document.getElementById('fees').value),
        availableTime: document.getElementById('availableTime').value.trim()
    };

    console.log('Payload being sent:', newDoctor);

    try {
        const response = await fetch(`${apiBaseUrl}/add`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newDoctor)
        });

        if (!response.ok) {
            const errorData = await response.json(); // Parse error response from the server
            throw new Error(errorData.message || 'Failed to add doctor');
        }

        await fetchDoctors();
        closeAddDoctor();
        alert('Doctor added successfully!');
    } catch (err) {
        console.error('Error adding doctor:', err);
        alert(`Failed to add doctor: ${err.message}`);
    }
}

async function saveDoctor(id) {
    const row = document.getElementById(`row-${id}`);
    const editButton = document.getElementById(`editBtn-${id}`);

    // Initialize the object with only `id` first
    const updatedDoctor = { id };

    // Loop through all inputs in the row to collect updated values
    row.querySelectorAll('input').forEach(input => {
        const field = input.getAttribute('data-field');  // This is the field name in frontend (camelCase)
        let value = input.value.trim();

        // Handle special cases where value needs conversion
        if (field === 'yearOfExp' || field === 'fees') {
            value = parseFloat(value); // Convert numeric fields to number
        } else if (field === 'availableTime') {
            value = value.replace(',');  // Remove unnecessary spaces around commas
        }

        // Add field to object directly — keep camelCase (matches backend expectation)
        updatedDoctor[field] = value;
    });

    console.log("Payload being sent:", updatedDoctor);

    try {
        const response = await fetch(`${apiBaseUrl}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedDoctor)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server responded with error:', errorText);
            throw new Error('Failed to update doctor');
        }

        // Refresh the doctor list to show updated data
        await fetchDoctors();
        alert('Doctor updated successfully!');
    } catch (err) {
        console.error('Error during update:', err);
        alert('Failed to update doctor. Please check the input.');
    }
}

// Delete doctor
async function deleteDoctor(id) {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    try {
        const response = await fetch(`${apiBaseUrl}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete doctor');

        await fetchDoctors();
    } catch (err) {
        console.error('Error deleting doctor:', err);
        alert('Failed to delete doctor');
    }
}

// Update pagination UI
function updatePagination() {
    const totalEntries = doctors.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage);
    totalEntriesSpan.innerText = totalEntries;

    pageNumbersDiv.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.onclick = () => {
            currentPage = i;
            renderTable();
        };
        if (i === currentPage) button.style.fontWeight = 'bold';
        pageNumbersDiv.appendChild(button);
    }
}

// Go to specific page
goToPageButton.onclick = () => {
    const page = parseInt(pageNumberInput.value);
    if (page >= 1 && page <= Math.ceil(doctors.length / rowsPerPage)) {
        currentPage = page;
        renderTable();
    } else {
        alert('Invalid page number');
    }
};

// Initial fetch on page load
fetchDoctors();
