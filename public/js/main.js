// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// গ্লোবাল ভেরিয়েবল
let searchTimeout;
let selectedHospital = null;

// হাসপাতাল সার্চ ফাংশন (গুগল স্টাইল)
function searchHospitals() {
    const query = document.getElementById('hospitalSearch').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    const searchStatus = document.getElementById('searchStatus');
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    resultsDiv.style.display = 'block';
    searchStatus.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
    
    // ডিবাউন্স - টাইপ করার পর ৩০০ms অপেক্ষা করে সার্চ করবে
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetch(`/donor/api/search-hospitals?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displaySearchResults(data.hospitals, query);
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                searchStatus.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Search failed';
            });
    }, 300);
}

// সার্চ রেজাল্ট দেখান
function displaySearchResults(hospitals, query) {
    const resultsList = document.getElementById('resultsList');
    const searchStatus = document.getElementById('searchStatus');
    
    if (hospitals.length === 0) {
        searchStatus.innerHTML = `<i class="bi bi-exclamation-circle"></i> No hospitals found for "${query}"`;
        resultsList.innerHTML = '';
        return;
    }
    
    searchStatus.innerHTML = `<i class="bi bi-check-circle"></i> Found ${hospitals.length} hospitals`;
    
    let html = '';
    hospitals.forEach(hospital => {
        // কোয়েরি হাইলাইট করুন
        const highlightedName = hospital.name.replace(
            new RegExp(query, 'gi'),
            match => `<span class="bg-warning bg-opacity-25">${match}</span>`
        );
        
        html += `
            <div class="search-result-item p-2 border-bottom" onclick="selectHospital(${hospital.id})">
                <div class="d-flex align-items-center">
                    <i class="bi bi-building text-primary me-2"></i>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${highlightedName}</div>
                        <small class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${hospital.area}, ${hospital.city}
                        </small>
                        <small class="text-muted ms-2">
                            <i class="bi bi-telephone"></i> ${hospital.phone || 'N/A'}
                        </small>
                    </div>
                    <span class="badge bg-${hospital.type === 'Government' ? 'success' : 'info'}">${hospital.type}</span>
                </div>
            </div>
        `;
    });
    
    resultsList.innerHTML = html;
}

// হাসপাতাল সিলেক্ট করুন
function selectHospital(hospitalId) {
    fetch(`/donor/api/hospital-details?id=${hospitalId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectedHospital = data.hospital;
                
                // সিলেক্টেড হাসপাতালের তথ্য দেখান
                document.getElementById('selectedHospitalName').textContent = selectedHospital.name;
                document.getElementById('selectedHospitalAddress').textContent = 
                    `${selectedHospital.address}, ${selectedHospital.city}`;
                document.getElementById('selectedHospitalPhone').textContent = 
                    `📞 ${selectedHospital.phone || 'N/A'}`;
                
                document.getElementById('selectedHospitalCard').style.display = 'block';
                document.getElementById('hospitalSearch').value = selectedHospital.name;
                document.getElementById('searchResults').style.display = 'none';
                
                // অটো-লোকেশন সেট করুন
                setHospitalLocation();
                
                showNotification(`✅ ${selectedHospital.name} selected`, 'success');
            }
        });
}

// হাসপাতালের লোকেশন সেট করুন
function setHospitalLocation() {
    if (selectedHospital) {
        const location = `${selectedHospital.lat}, ${selectedHospital.lng}`;
        document.getElementById('location').value = location;
        
        // হাসপাতালের ম্যাপ দেখান
        showHospitalMap(selectedHospital);
        
        document.getElementById('location-status').innerHTML = `
            <span class="text-success">
                <i class="bi bi-check-circle-fill"></i> 
                Location: ${selectedHospital.name}, ${selectedHospital.city}
            </span>
        `;
    }
}

// সিলেক্টেড হাসপাতালের লোকেশন ব্যবহার করুন
function useSelectedHospitalLocation() {
    setHospitalLocation();
    showNotification('✅ Hospital location set', 'success');
}

// হাসপাতালের ম্যাপ দেখান
function showHospitalMap(hospital) {
    const mapDiv = document.getElementById('selectedHospitalMap');
    mapDiv.style.display = 'block';
    
    mapDiv.innerHTML = `
        <iframe 
            width="100%" 
            height="150" 
            frameborder="0" 
            style="border:0; border-radius: 8px;"
            src="https://www.openstreetmap.org/export/embed.html?bbox=${hospital.lng-0.01},${hospital.lat-0.01},${hospital.lng+0.01},${hospital.lat+0.01}&layer=mapnik&marker=${hospital.lat},${hospital.lng}"
            allowfullscreen>
        </iframe>
    `;
}

// সার্চ ক্লিয়ার করুন
function clearSearch() {
    document.getElementById('hospitalSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
    clearSelectedHospital();
}

// সিলেক্টেড হাসপাতাল ক্লিয়ার করুন
function clearSelectedHospital() {
    selectedHospital = null;
    document.getElementById('selectedHospitalCard').style.display = 'none';
    document.getElementById('selectedHospitalMap').style.display = 'none';
    document.getElementById('location').value = '';
    document.getElementById('location-status').innerHTML = '';
}

// নতুন হাসপাতাল যোগ করার ফর্ম দেখান
function showAddHospitalForm() {
    document.getElementById('addHospitalForm').style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
}

// নতুন হাসপাতাল যোগ করুন
function addNewHospital() {
    const name = document.getElementById('newHospitalName').value.trim();
    const city = document.getElementById('newHospitalCity').value;
    const area = document.getElementById('newHospitalArea').value.trim();
    const address = document.getElementById('newHospitalAddress').value.trim();
    const phone = document.getElementById('newHospitalPhone').value.trim();
    
    if (!name || !city) {
        alert('Hospital name and city are required');
        return;
    }
    
    // শহরের সেন্টার পয়েন্ট
    const cityCenters = {
        'Dhaka': { lat: 23.777, lng: 90.400 },
        'Rajshahi': { lat: 24.374, lng: 88.604 },
        'Chittagong': { lat: 22.347, lng: 91.812 },
        'Khulna': { lat: 22.816, lng: 89.560 },
        'Sylhet': { lat: 24.894, lng: 91.868 },
        'Barisal': { lat: 22.700, lng: 90.371 },
        'Rangpur': { lat: 25.743, lng: 89.250 },
        'Mymensingh': { lat: 24.753, lng: 90.406 }
    };
    
    const center = cityCenters[city] || cityCenters['Dhaka'];
    
    // নতুন হাসপাতাল অবজেক্ট
    selectedHospital = {
        id: 'custom_' + Date.now(),
        name: name,
        city: city,
        area: area || 'Unknown',
        address: address || `${name}, ${city}`,
        lat: center.lat,
        lng: center.lng,
        phone: phone || 'N/A',
        type: 'Private'
    };
    
    // সিলেক্টেড হাসপাতাল সেট করুন
    document.getElementById('selectedHospitalName').textContent = selectedHospital.name;
    document.getElementById('selectedHospitalAddress').textContent = 
        `${selectedHospital.address}, ${selectedHospital.city}`;
    document.getElementById('selectedHospitalPhone').textContent = 
        `📞 ${selectedHospital.phone}`;
    
    document.getElementById('selectedHospitalCard').style.display = 'block';
    document.getElementById('hospitalSearch').value = selectedHospital.name;
    
    // লোকেশন সেট করুন
    setHospitalLocation();
    
    // ফর্ম লুকান
    cancelAddHospital();
    
    showNotification(`✅ ${name} added successfully`, 'success');
}

// অ্যাড হাসপাতাল ফর্ম ক্যান্সেল
function cancelAddHospital() {
    document.getElementById('addHospitalForm').style.display = 'none';
    document.getElementById('newHospitalName').value = '';
    document.getElementById('newHospitalCity').value = '';
    document.getElementById('newHospitalArea').value = '';
    document.getElementById('newHospitalAddress').value = '';
    document.getElementById('newHospitalPhone').value = '';
}

// ডকুমেন্টে ক্লিক করলে সার্চ রেজাল্ট বন্ধ হবে
document.addEventListener('click', function(event) {
    const searchBox = document.getElementById('hospitalSearch');
    const resultsDiv = document.getElementById('searchResults');
    
    if (!searchBox.contains(event.target) && !resultsDiv.contains(event.target)) {
        resultsDiv.style.display = 'none';
    }
});

// আপডেটেড findDonors ফাংশন
function findDonors() {
    if (!selectedHospital) {
        alert('Please select a hospital first');
        return;
    }
    
    const bloodGroup = document.getElementById('bloodGroup').value;
    const message = document.getElementById('message').value;
    
    if (!bloodGroup || !message) {
        alert('Please fill all required fields');
        return;
    }
    
    showNotification('🔍 Searching for donors...', 'info');
    
    fetch(`/donor/api/emergency-donors?bloodGroup=${bloodGroup}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.donors.length > 0) {
                displayDonorsWithLocation(data.donors);
                showNotification(`✅ Found ${data.donors.length} donors near ${selectedHospital.city}`, 'success');
            } else {
                showNoDonorsFound();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('❌ Failed to find donors', 'error');
        });
}

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}// Form validation for image upload
function validateImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        
        img.onload = function() {
            if (this.width === 500 && this.height === 500) {
                // Valid dimensions
                document.getElementById('image-error').style.display = 'none';
            } else {
                // Invalid dimensions
                document.getElementById('image-error').style.display = 'block';
                input.value = ''; // Clear the input
            }
        };
        
        img.src = URL.createObjectURL(file);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchBloodGroup');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const bloodGroup = this.value;
                window.location.href = `/admin/donors/search?bloodGroup=${bloodGroup}`;
            }
        });
    }
});

// Delete confirmation
function confirmDelete(donorId) {
    if (confirm('Are you sure you want to delete this donor?')) {
        document.getElementById('delete-form-' + donorId).submit();
    }
}

// Emergency search
function emergencySearch() {
    const bloodGroup = document.getElementById('emergencyBloodGroup').value;
    if (bloodGroup) {
        window.location.href = `/admin/emergency?bloodGroup=${bloodGroup}`;
    }
}

// Print report
function printReport() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}