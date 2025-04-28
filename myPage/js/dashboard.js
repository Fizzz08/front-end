
const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000"  // Local Development
    : "https://chikithsa.netlify.app"; // Netlify Deployment
    
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
const rowsPerPage = 6;

// Fetch all doctors
async function fetchDoctors() {
    if (!token) {
        alert('Unauthorized access. Please log in again.');
        window.location.href = BASE_URL + '/myPage/HTML/login.html';
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
            updatePagination(); 
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


let sortOrder = 'asc'; // Default sort order
let sortColumn = 'id'; // Default sort column

// Columns that require special sorting logic (time and days)
const specialColumns = {
    availableTime: (value) => {
        // Convert time like '9:00 AM' to a comparable format like Date object or minutes since midnight
        const timeParts = value.split(' ')[0].split(':');
        const isPM = value.includes('PM');
        let hours = parseInt(timeParts[0]);
        let minutes = parseInt(timeParts[1]);

        // Adjust hours for PM
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0; // Convert 12 AM to 0 hours

        // Convert to total minutes
        return hours * 60 + minutes;
    },
    availableDays: (value) => {
        // Order of days (for sorting purposes)
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        if (!value) return 7; // If no day is available, place at the end (Sunday)
        
        // For multiple days, sort them by the defined order
        const days = value.split(',').map(day => day.trim()); // Split by commas and trim spaces
        const sortedDays = days.map(day => daysOrder.indexOf(day)); // Convert days to their order index

        // Get the earliest day for sorting purposes (next available day)
        const minDayIndex = Math.min(...sortedDays);

        return minDayIndex; // Return the index of the earliest day for sorting
    }
};

// Toggle sort order when clicking the arrows
function toggleSortOrder() {
    sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc'; // Toggle between 'asc' and 'desc'
    updateSortArrows(); // Update the arrows to reflect the current sort order
    sortDoctors(); // Re-sort the doctors based on the new order
}

// Handle column selection from the dropdown for sorting
function sortDoctors() {
    const numericColumns = ['yearOfExp', 'fees', 'id']; // Columns expected to have numerical values
    const isNumericColumn = numericColumns.includes(sortColumn);

    // Check if the column has a special sorting logic (time or days)
    const isSpecialColumn = specialColumns.hasOwnProperty(sortColumn);

    // Sort the doctors array based on the selected column and order
    doctors.sort((a, b) => {
        let valueA = a[sortColumn];
        let valueB = b[sortColumn];

        if (isSpecialColumn) {
            valueA = specialColumns[sortColumn](valueA); // Apply special sorting logic for time/days
            valueB = specialColumns[sortColumn](valueB);
        } else if (isNumericColumn) {
            valueA = parseFloat(valueA) || 0; // Handle NaN for non-numeric values
            valueB = parseFloat(valueB) || 0;
        } else {
            valueA = valueA.toString().toLowerCase();
            valueB = valueB.toString().toLowerCase();
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable(); // Render the sorted table
}

// Update sorting arrows
function updateSortArrows() {
    const ascArrow = document.getElementById('ascArrow');
    const descArrow = document.getElementById('descArrow');

    // Show the arrows based on the current sort order (ascending or descending)
    if (sortOrder === 'asc') {
        ascArrow.classList.add('active-arrow');
        ascArrow.classList.remove('inactive-arrow');
        descArrow.classList.add('inactive-arrow');
        descArrow.classList.remove('active-arrow');
    } else {
        descArrow.classList.add('active-arrow');
        descArrow.classList.remove('inactive-arrow');
        ascArrow.classList.add('inactive-arrow');
        ascArrow.classList.remove('active-arrow');
    }
}

// Render the sorted table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; // Clear the current table rows
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, doctors.length);

    doctors.slice(start, end).forEach(doctor => {
        const row = document.createElement('tr');
        row.setAttribute('id', `row-${doctor.id}`);

        row.innerHTML = `
            <td data-column="id">${doctor.id}</td>
            <td><span class="editable" data-field="name">${doctor.name}</span></td>
            <td><span class="editable" data-field="specialization">${doctor.specialization}</span></td>
            <td><span class="editable" data-field="location">${doctor.location}</span></td>
            <td class="centered-column"><span class="editable" data-field="yearOfExp">${doctor.yearOfExp}</span></td>
            <td><span class="editable" data-field="availableDays">${doctor.availableDays}</span></td>
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
}

// Initialize sorting event listener for column selection
document.getElementById('sortColumn').addEventListener('change', function() {
    sortColumn = this.value; // Get the selected column from the dropdown
    sortDoctors(); // Sort the table based on the selected column
});




// Filter doctors based on search input
function filterDoctors() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();

    // Filter the doctors array based on the search query
    const filteredDoctors = doctors.filter(doctor => 
        doctor.id.toString().includes(searchInput) ||                     // Search by ID
        doctor.name.toLowerCase().includes(searchInput) ||
        doctor.specialization.toLowerCase().includes(searchInput) ||
        doctor.location.toLowerCase().includes(searchInput)
    );

    // Render filtered doctors while maintaining functionality
    renderFilteredTable(filteredDoctors);
}

// Render filtered doctors with functional buttons
function renderFilteredTable(filteredDoctors) {
    tableBody.innerHTML = '';  // Clear the table

    filteredDoctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.setAttribute('id', `row-${doctor.id}`);
        
        row.innerHTML = `
            <td>${doctor.id}</td>
            <td><span class="editable" data-field="name">${doctor.name}</span></td>
            <td><span class="editable" data-field="specialization">${doctor.specialization}</span></td>
            <td><span class="editable" data-field="location">${doctor.location}</span></td>
            <td class="centered-column"><span class="editable" data-field="yearOfExp">${doctor.yearOfExp}</span></td>
            <td><span class="editable" data-field="availableDays">${doctor.availableDays}</span></td>
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

    // Update pagination based on filtered results
    fromSpan.innerText = filteredDoctors.length > 0 ? 1 : 0;
    toSpan.innerText = filteredDoctors.length;
    totalEntriesSpan.innerText = filteredDoctors.length;
}
