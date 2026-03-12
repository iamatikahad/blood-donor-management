// emergency.js - সমস্ত JavaScript ফাংশন এখানে থাকবে

let selectedHospital = null;
let searchTimeout;
let userLat, userLng;

// ==================== ব্লাড গ্রুপ সিলেকশন ====================
function selectBloodGroup(group) {
    document.querySelectorAll('.blood-group-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    document.getElementById('bloodGroup').value = group;
}

// ==================== কোয়ান্টিটি আপডেট ====================
function updateQuantity(change) {
    const input = document.getElementById('quantity');
    let value = parseInt(input.value) + change;
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    input.value = value;
}

// ==================== হাসপাতাল সার্চ ====================
function searchHospitals() {
    const query = document.getElementById('hospitalSearch').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    resultsDiv.style.display = 'block';
    document.getElementById('searchStatus').innerHTML = '<i class="bi bi-hourglass"></i> Searching...';
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetch(`/donor/api/search-hospitals?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    displaySearchResults(data.hospitals);
                }
            })
            .catch(err => {
                console.error('Search error:', err);
                document.getElementById('searchStatus').innerHTML = '<i class="bi bi-exclamation-triangle"></i> Search failed';
            });
    }, 300);
}

function displaySearchResults(hospitals) {
    const list = document.getElementById('resultsList');
    const status = document.getElementById('searchStatus');
    
    if (hospitals.length === 0) {
        status.innerHTML = '<i class="bi bi-exclamation-circle"></i> No hospitals found';
        list.innerHTML = '';
        return;
    }
    
    status.innerHTML = `<i class="bi bi-check-circle"></i> Found ${hospitals.length} hospitals`;
    
    list.innerHTML = hospitals.map(h => `
        <div class="result-item" onclick="selectHospital(${h.id})">
            <i class="bi bi-building"></i>
            <div>
                <strong>${h.name}</strong>
                <br>
                <small>${h.area}, ${h.city}</small>
            </div>
        </div>
    `).join('');
}

function selectHospital(id) {
    fetch(`/donor/api/hospital-details?id=${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                selectedHospital = data.hospital;
                document.getElementById('selectedHospitalName').innerHTML = selectedHospital.name;
                document.getElementById('selectedHospitalAddress').innerHTML = 
                    `<i class="bi bi-geo-alt"></i> ${selectedHospital.address}`;
                document.getElementById('selectedHospitalPhone').innerHTML = 
                    `<i class="bi bi-telephone"></i> ${selectedHospital.phone || 'N/A'}`;
                document.getElementById('selectedHospitalCard').style.display = 'block';
                document.getElementById('hospitalSearch').value = selectedHospital.name;
                document.getElementById('searchResults').style.display = 'none';
            }
        });
}

function clearSearch() {
    document.getElementById('hospitalSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

function clearSelectedHospital() {
    selectedHospital = null;
    document.getElementById('selectedHospitalCard').style.display = 'none';
}

function showAddHospitalForm() {
    document.getElementById('addHospitalForm').style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
}

function cancelAddHospital() {
    document.getElementById('addHospitalForm').style.display = 'none';
}

function addNewHospital() {
    const name = document.getElementById('newHospitalName').value.trim();
    const city = document.getElementById('newHospitalCity').value;
    const area = document.getElementById('newHospitalArea').value.trim();
    const phone = document.getElementById('newHospitalPhone').value.trim();
    const address = document.getElementById('newHospitalAddress').value.trim();

    if (!name || !city) {
        alert('Hospital name and city are required');
        return;
    }

    // City center coordinates
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

    selectedHospital = {
        name: name,
        city: city,
        area: area || 'Unknown',
        address: address || `${name}, ${city}`,
        phone: phone || 'N/A',
        lat: center.lat,
        lng: center.lng
    };

    document.getElementById('selectedHospitalName').innerHTML = selectedHospital.name;
    document.getElementById('selectedHospitalAddress').innerHTML = 
        `<i class="bi bi-geo-alt"></i> ${selectedHospital.address}`;
    document.getElementById('selectedHospitalPhone').innerHTML = 
        `<i class="bi bi-telephone"></i> ${selectedHospital.phone}`;
    document.getElementById('selectedHospitalCard').style.display = 'block';
    document.getElementById('hospitalSearch').value = selectedHospital.name;
    
    cancelAddHospital();
    showNotification('✅ Hospital added successfully');
}

// ==================== লোকেশন ফাংশন ====================
function getLocation() {
    if (navigator.geolocation) {
        document.getElementById('location-status').innerHTML = 'Getting location...';
        
        navigator.geolocation.getCurrentPosition(
            position => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                
                document.getElementById('location').value = `${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;
                document.getElementById('location-status').innerHTML = '✅ Location captured!';
                
                document.getElementById('map').style.display = 'block';
                showMap(userLat, userLng);
            },
            error => {
                let message = 'Location error';
                if (error.code === 1) message = 'Location access denied';
                else if (error.code === 2) message = 'Location unavailable';
                else if (error.code === 3) message = 'Location timed out';
                
                document.getElementById('location-status').innerHTML = `❌ ${message}`;
            }
        );
    } else {
        alert('Geolocation not supported');
    }
}

function showMap(lat, lng) {
    document.getElementById('map').innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            frameborder="0" 
            style="border:0"
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}"
            allowfullscreen>
        </iframe>
    `;
}

function useSelectedHospitalLocation() {
    if (selectedHospital) {
        document.getElementById('location').value = `${selectedHospital.lat}, ${selectedHospital.lng}`;
        document.getElementById('location-status').innerHTML = `📍 Using ${selectedHospital.name} location`;
        showMap(selectedHospital.lat, selectedHospital.lng);
    }
}

// ==================== ডোনার খোঁজা ====================
function findDonors() {
    const bloodGroup = document.getElementById('bloodGroup').value;
    const hospital = document.getElementById('hospitalSearch').value;
    const message = document.getElementById('message').value;
    
    if (!bloodGroup) {
        alert('Please select blood group');
        return;
    }
    
    if (!hospital) {
        alert('Please select a hospital');
        return;
    }
    
    if (!message) {
        alert('Please enter emergency message');
        return;
    }
    
    showNotification('🔍 Searching for donors...');
    
    fetch(`/donor/api/emergency-donors?bloodGroup=${bloodGroup}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.donors.length > 0) {
                displayDonors(data.donors);
                document.getElementById('donorCount').textContent = data.donors.length;
                document.getElementById('donorResults').style.display = 'block';
                showNotification(`✅ Found ${data.donors.length} donors`);
            } else {
                alert('No eligible donors found');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to find donors');
        });
}

function displayDonors(donors) {
    const list = document.getElementById('donorList');
    list.innerHTML = donors.map(donor => `
        <div class="donor-card">
            <h4>${donor.name}</h4>
            <p><i class="bi bi-droplet"></i> ${donor.bloodGroup}</p>
            <p><i class="bi bi-telephone"></i> ${donor.contact || donor.mobile}</p>
            <p><i class="bi bi-geo-alt"></i> ${donor.address || 'N/A'}</p>
            <button class="btn-call" onclick="callDonor('${donor.contact || donor.mobile}')">
                <i class="bi bi-telephone"></i> Call
            </button>
        </div>
    `).join('');
}

function callDonor(phone) {
    window.location.href = `tel:${phone}`;
}

// ==================== নিকটস্থ ব্লাড ব্যাংক ====================
function findNearbyBloodBanks() {
    if (!userLat || !userLng) {
        alert('Please get your location first');
        return;
    }
    
    showNotification('🔍 Finding nearby blood banks...');
    
    // Demo data - replace with actual API call
    const demoBanks = [
        { name: 'Dhaka Medical College', distance: '2.5 km', phone: '01769000911' },
        { name: 'Square Hospital', distance: '3.8 km', phone: '01714000001' },
        { name: 'Ibn Sina Hospital', distance: '4.2 km', phone: '01769000003' }
    ];
    
    displayBloodBanks(demoBanks);
}

function displayBloodBanks(banks) {
    const list = document.getElementById('bloodBankList');
    list.innerHTML = banks.map(bank => `
        <div class="bloodbank-item">
            <h5>${bank.name}</h5>
            <p>📏 ${bank.distance} | 📞 ${bank.phone}</p>
            <button class="btn-call" onclick="callDonor('${bank.phone}')">
                <i class="bi bi-telephone"></i> Call
            </button>
        </div>
    `).join('');
}

// ==================== মডেল ====================
function showRequestModal() {
    document.getElementById('requestModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('requestModal').style.display = 'none';
}

// ==================== নোটিফিকেশন ====================
function showNotification(message, type = 'success') {
    // Simple alert for now
    alert(message);
}

// ==================== ট্রান্সপোর্ট অপশন ====================
document.getElementById('needTransport')?.addEventListener('change', function() {
    document.getElementById('transportDetails').style.display = 
        this.checked ? 'block' : 'none';
});