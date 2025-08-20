
let currentStep = 1;
let selectedSpecialist = '';
let selectedDate = '';
let selectedTime = '';
let selectedServices = [];
let isAuthenticated = false;
let userData = null;
let bookingConfirmed = false;
let userMenuVisible = false;
let bookedTimes = {};  

window.addEventListener('load', function() {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
        userData = JSON.parse(storedUserData);
        isAuthenticated = true;
    }
    updateAuthButton();
    
    const storedBooking = localStorage.getItem('confirmedBooking');
    if (storedBooking) {
        const booking = JSON.parse(storedBooking);
        selectedSpecialist = booking.specialist;
        selectedDate = booking.date;
        selectedTime = booking.time;
        selectedServices = booking.services;
        bookingConfirmed = true;
        window.currentBookingId = booking.id;
        updateBookingSummary();
    }

    renderSpecialists();
    renderServices();

    const completeBookingBtn = document.getElementById('complete-booking');
    if (completeBookingBtn) {
        completeBookingBtn.addEventListener('click', function() {
            showModal('complete-confirmation-modal');
        });
    }
});

function showSection(section) {
    if (!isAuthenticated) {
        showModal('auth-modal');
        return;
    }
    showModal(`${section}-modal`);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (!modal || !overlay) return;
    
    modal.style.display = 'block';
    overlay.classList.add('show');
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    if (modalId === 'datetime-modal') {
        renderCalendar();
    }

    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('overlay');
    
    if (!modal || !overlay) return;
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
    
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Check if all modals are closed
        const visibleModals = document.querySelectorAll('.modal.show');
        if (visibleModals.length === 0) {
            // Re-enable body scroll
            document.body.style.overflow = '';
        }
    }, 300);
}

function selectSpecialist(element, name) {
    document.querySelectorAll('.specialist-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    element.classList.add('selected');
    
    selectedSpecialist = name;
    
    const nextButton = document.getElementById('specialists-next');
    if (nextButton) {
        nextButton.classList.remove('hidden');
    }

    if (selectedDate) {
        loadBookedTimes(selectedDate);
    }
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    const today = dayjs();
    dayjs.locale('uz');
    
    let calendarHTML = `
        <div class="grid grid-cols-7 gap-2">
            ${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(day => 
                `<div class="text-center text-sm text-gray-400">${day}</div>`
            ).join('')}
        </div>
        <div class="grid grid-cols-7 gap-2 mt-2">
    `;

    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');
    const daysInPreviousMonth = startOfMonth.day();

    for (let i = 0; i < daysInPreviousMonth; i++) {
        calendarHTML += '<div></div>';
    }

    for (let date = startOfMonth; date.isBefore(endOfMonth.add(1, 'day')); date = date.add(1, 'day')) {
        const isToday = date.isSame(today, 'day');
        const isPast = date.isBefore(today, 'day'); 
        const dateStr = date.format('YYYY-MM-DD');
        const isSelected = dateStr === selectedDate;
        
        calendarHTML += `
            <button 
                onclick="${isPast ? '' : `selectDate(this, '${dateStr}')`}"
                class="p-2 rounded-lg transition-colors ${
                    isPast ? 'opacity-50 cursor-not-allowed text-gray-500' : 
                    isSelected ? 'gradient-border' :
                    isToday ? 'gradient-border' : 
                    'hover:bg-white/10'
                }"
                ${isPast ? 'disabled' : ''}
            >
                ${date.date()}
            </button>
        `;
    }

    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;
}

function selectDate(element, date) {
    document.querySelectorAll('#calendar button').forEach(btn => {
        btn.classList.remove('gradient-border');
    });
    element.classList.add('gradient-border');
    selectedDate = date;
    loadBookedTimes(date);
}

// Load booked times from Firebase
async function loadBookedTimes(date) {
    if (!selectedSpecialist) {
        alert("Iltimos, avval mutaxassisni tanlang");
        return;
    }

    try {
        const db = window.firebaseDb;
        const q = window.firebaseQuery(
            window.firebaseCollection(db, "bookings"), 
            window.firebaseWhere("date", "==", date),
            window.firebaseWhere("specialist", "==", selectedSpecialist)
        );
        
        const querySnapshot = await window.firebaseGetDocs(q);
        
        if (!bookedTimes[selectedSpecialist]) {
            bookedTimes[selectedSpecialist] = {};
        }
        bookedTimes[selectedSpecialist][date] = [];
        
        querySnapshot.forEach((docSnapshot) => {
            const time = docSnapshot.data().time;
            bookedTimes[selectedSpecialist][date].push(time);
            
            if (!bookedTimes[selectedSpecialist].docs) {
                bookedTimes[selectedSpecialist].docs = {};
            }
            bookedTimes[selectedSpecialist].docs[time] = docSnapshot.id;
        });
        
        renderTimeSlots();
    } catch (error) {
        console.error("Error loading booked times:", error);
        alert("Vaqtlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
}

function renderTimeSlots() {
    const timeSlots = [
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
    ];
    
    const container = document.getElementById('time-slots');
    if (!container) return;
    
    const specialistBookedTimes = bookedTimes[selectedSpecialist] && 
                                 bookedTimes[selectedSpecialist][selectedDate] ? 
                                 bookedTimes[selectedSpecialist][selectedDate] : [];
    
    container.innerHTML = timeSlots.map(time => {
        const isBooked = specialistBookedTimes.includes(time);
        const isSelected = time === selectedTime;
        
        return `
            <button 
                ${isBooked ? '' : `onclick="selectTime(this, '${time}')"`}
                class="time-slot p-3 rounded-lg text-center ${
                    isBooked ? 'bg-red-500/10 border-red-500/30 opacity-60 cursor-not-allowed' : 
                    isSelected ? 'selected' : 
                    'hover:bg-white/10'
                }"
            >
                <div class="text-sm font-medium">${time}</div>
                <div class="text-xs text-gray-400">${isBooked ? 'Band' : 'Bo\'sh'}</div>
            </button>
        `;
    }).join('');
}

function selectTime(element, time) {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedTime = time;
    
    const nextButton = document.getElementById('datetime-next');
    if (nextButton) {
        nextButton.classList.remove('hidden');
    }
}

function selectService(element, name, price) {
    element.classList.toggle('selected');
    
    if (element.classList.contains('selected')) {
        selectedServices.push({ name, price });
    } else {
        selectedServices = selectedServices.filter(service => service.name !== name);
    }
    
    updateTotalPrice();
}

function updateTotalPrice() {
    const total = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const totalContainer = document.getElementById('total-price-container');
    const totalElement = document.getElementById('total-price');
    
    if (!totalContainer || !totalElement) return;
    
    if (selectedServices.length > 0) {
        totalContainer.classList.remove('hidden');
        totalElement.textContent = `${total.toLocaleString()} so'm`;
    } else {
        totalContainer.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const phone = document.getElementById('phone').value;

            userData = { firstName, lastName, phone };
            isAuthenticated = true;
            
            localStorage.setItem('userData', JSON.stringify(userData));
            
            updateAuthButton();
            
            hideModal('auth-modal');
            showModal('specialists-modal');
        });
    }

    const confirmServicesBtn = document.getElementById('confirmServices');
    if (confirmServicesBtn) {
        confirmServicesBtn.addEventListener('click', confirmBooking);
    }

    const cancelBookingBtn = document.getElementById('cancel-booking');
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', function() {
            showModal('cancel-confirmation-modal');
        });
    }

    const serviceSearch = document.getElementById('serviceSearch');
    if (serviceSearch) {
        serviceSearch.addEventListener('input', handleServiceSearch);
    }
});

function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');
    
    if (!authButton || !authButtonText) return;
    
    if (isAuthenticated && userData) {
        authButtonText.textContent = `${userData.firstName}`;
        authButton.classList.add('gradient-border');
        authButton.onclick = showUserMenu;
    } else {
        authButtonText.textContent = 'Kirish';
        authButton.classList.remove('gradient-border');
        authButton.onclick = () => showModal('auth-modal');
    }
}

function showUserMenu() {
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu glass-morphism';
    userMenu.innerHTML = `
        <div class="p-4 border-b border-white/10">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full gradient-border flex items-center justify-center">
                    <i class='bx bx-user text-xl'></i>
                </div>
                <div>
                    <p class="font-medium">${userData.firstName} ${userData.lastName}</p>
                    <p class="text-sm text-gray-400">${userData.phone}</p>
                </div>
            </div>
        </div>
        <div class="py-2">
            <a href="#" class="user-menu-item" onclick="showLogoutConfirmation(); return false;">
                <i class='bx bx-log-out text-xl'></i>
                <span>Chiqish</span>
            </a>
        </div>
    `;
    
    const authButton = document.getElementById('authButton');
    if (authButton) {
        authButton.appendChild(userMenu);
        
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!userMenu.contains(e.target) && e.target !== authButton) {
                    userMenu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    }
}

function showLogoutConfirmation() {
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    showModal('logout-confirmation-modal');
}

function confirmLogout() {
    logout();
    hideModal('logout-confirmation-modal');
}

function logout() {
    isAuthenticated = false;
    userData = null;
    localStorage.removeItem('userData');
    updateAuthButton();
    resetBooking();
}

const specialists = [
    { name: 'Элеонора', role: 'Мастер ногтевого сервиса', rating: 4.8, reviews: 127 },
    { name: 'Хаким', role: 'Барбер', rating: 4.9, reviews: 93 },
    { name: 'Азиза', role: 'Стилист', rating: 4.7, reviews: 156 }
];

function renderSpecialists() {
    const container = document.getElementById('specialists-container');
    if (!container) return;
    
    container.innerHTML = specialists.map(specialist => `
        <div class="specialist-card glass-morphism p-6 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform ${selectedSpecialist === specialist.name ? 'selected' : ''}"
             onclick="selectSpecialist(this, '${specialist.name}')">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl gradient-border flex items-center justify-center">
                    <i class='bx bx-user text-2xl'></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold">${specialist.name}</h3>
                    <p class="text-sm text-gray-400">${specialist.role}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <i class='bx bxs-star text-yellow-400'></i>
                        <span class="text-sm">${specialist.rating}</span>
                        <span class="text-sm text-gray-400">(${specialist.reviews} отзывов)</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (selectedSpecialist) {
        const nextButton = document.getElementById('specialists-next');
        if (nextButton) {
            nextButton.classList.remove('hidden');
        }
    }
}

const services = [
    { name: 'Мужская стрижка', duration: '1 час', price: 150000 },
    { name: 'Бритье бороды', duration: '30 минут', price: 100000 },
    { name: 'Укладка волос', duration: '45 минут', price: 80000 },
    { name: 'Детская стрижка', duration: '45 минут', price: 120000 },
    { name: 'Окрашивание', duration: '2 часа', price: 250000 }
];

function renderServices() {
    const container = document.getElementById('services-container');
    if (!container) return;
    
    container.innerHTML = services.map(service => `
        <div class="service-card p-6 rounded-xl cursor-pointer ${selectedServices.some(s => s.name === service.name) ? 'selected' : ''}"
             onclick="selectService(this, '${service.name}', ${service.price})">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold">${service.name}</h3>
                    <p class="text-sm text-gray-400">${service.duration}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold">${service.price.toLocaleString()} so'm</p>
                </div>
            </div>
        </div>
    `).join('');
    
    updateTotalPrice();
}

function handleServiceSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredServices = services.filter(service => 
        service.name.toLowerCase().includes(searchTerm)
    );
    
    const container = document.getElementById('services-container');
    if (!container) return;
    
    container.innerHTML = filteredServices.map(service => `
        <div class="service-card p-6 rounded-xl cursor-pointer ${selectedServices.some(s => s.name === service.name) ? 'selected' : ''}"
             onclick="selectService(this, '${service.name}', ${service.price})">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold">${service.name}</h3>
                    <p class="text-sm text-gray-400">${service.duration}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold">${service.price.toLocaleString()} so'm</p>
                </div>
            </div>
        </div>
    `).join('');
}

async function confirmBooking() {
    if (!selectedSpecialist || !selectedDate || !selectedTime || selectedServices.length === 0) {
        alert('Iltimos, barcha maydonlarni to\'ldiring');
        return;
    }

    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
    
    try {
        const confirmButton = document.getElementById('confirmServices');
        if (confirmButton) {
            confirmButton.textContent = "Yuborilmoqda...";
            confirmButton.disabled = true;
        }
        
        const db = window.firebaseDb;
        const docRef = await window.firebaseAddDoc(window.firebaseCollection(db, "bookings"), {
            name: `${userData.firstName} ${userData.lastName}`,
            phone: userData.phone,
            specialist: selectedSpecialist,
            date: selectedDate,
            time: selectedTime,
            services: selectedServices.map(s => s.name),
            totalPrice: totalPrice,
            createdAt: new Date().toISOString()
        });

        window.currentBookingId = docRef.id;
        
        const message = `
🆕 *Yangi buyurtma*

👤 *Mijoz ma'lumotlari:*
- Ism-familiya: ${userData.firstName} ${userData.lastName}
- Telefon: ${userData.phone}

💈 *Buyurtma ma'lumotlari:*
- Sartarosh: ${selectedSpecialist}
- Sana: ${selectedDate}
- Vaqt: ${selectedTime}

✂️ *Tanlangan xizmatlar:*
${selectedServices.map(service => `- ${service.name} - ${service.price.toLocaleString()} so'm`).join('\n')}

💰 *Umumiy narx:* ${totalPrice.toLocaleString()} so'm`;

        const botToken = '7758261570:AAGG1bZeHVsey-xRZqACn8ZKYquYQ6UxaOA';
        const chatId = '7675613595';

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        if (confirmButton) {
            confirmButton.textContent = "Tasdiqlash";
            confirmButton.disabled = false;
        }
        
        alert('Buyurtmangiz muvaffaqiyatli yuborildi! Tez orada siz bilan bog\'lanamiz.');
        bookingConfirmed = true;
        
        const booking = {
            id: window.currentBookingId,
            specialist: selectedSpecialist,
            date: selectedDate,
            time: selectedTime,
            services: selectedServices
        };
        localStorage.setItem('confirmedBooking', JSON.stringify(booking));
        
        if (!bookedTimes[selectedSpecialist]) {
            bookedTimes[selectedSpecialist] = {};
        }
        if (!bookedTimes[selectedSpecialist][selectedDate]) {
            bookedTimes[selectedSpecialist][selectedDate] = [];
        }
        bookedTimes[selectedSpecialist][selectedDate].push(selectedTime);
        
        if (!bookedTimes[selectedSpecialist].docs) {
            bookedTimes[selectedSpecialist].docs = {};
        }
        bookedTimes[selectedSpecialist].docs[selectedTime] = docRef.id;
        
        updateBookingSummary();
        resetModals();
    } catch (error) {
        console.error('Error:', error);
        const confirmButton = document.getElementById('confirmServices');
        if (confirmButton) {
            confirmButton.textContent = "Tasdiqlash";
            confirmButton.disabled = false;
        }
        alert('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
}

function updateBookingSummary() {
    if (!bookingConfirmed) return;
    
    const summaryElement = document.getElementById('booking-summary');
    const specialistElement = document.getElementById('summary-specialist');
    const datetimeElement = document.getElementById('summary-datetime');
    const servicesElement = document.getElementById('summary-services');
    const totalElement = document.getElementById('summary-total');
    
    if (!summaryElement || !specialistElement || !datetimeElement || !servicesElement || !totalElement) return;
    
    specialistElement.querySelector('span.font-medium').textContent = selectedSpecialist;
    datetimeElement.querySelector('span.font-medium').textContent = `${selectedDate}, ${selectedTime}`;
    
    const serviceNames = selectedServices.map(service => service.name).join(', ');
    servicesElement.querySelector('span.font-medium').textContent = serviceNames;
    
    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
    totalElement.querySelector('span.font-medium').textContent = `${totalPrice.toLocaleString()} so'm`;
    
    summaryElement.classList.remove('hidden');
}

async function confirmCancellation() {
    if (!bookingConfirmed) return;
    
    try {
        if (window.currentBookingId) {
            const db = window.firebaseDb;
            await window.firebaseDeleteDoc(window.firebaseDoc(db, "bookings", window.currentBookingId));

             if (bookedTimes[selectedSpecialist] && 
                bookedTimes[selectedSpecialist][selectedDate]) {
                const index = bookedTimes[selectedSpecialist][selectedDate].indexOf(selectedTime);
                if (index > -1) {
                    bookedTimes[selectedSpecialist][selectedDate].splice(index, 1);
                }
            }
        }
        
        const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
        
        const botToken = '7758261570:AAGG1bZeHVsey-xRZqACn8ZKYquYQ6UxaOA';
        const chatId = '7675613595';
        
        const message = `
❌ *Buyurtma bekor qilindi*

👤 *Mijoz ma'lumotlari:*
- Ism-familiya: ${userData.firstName} ${userData.lastName}
- Telefon: ${userData.phone}

💈 *Bekor qilingan buyurtma ma'lumotlari:*
- Sartarosh: ${selectedSpecialist}
- Sana: ${selectedDate}
- Vaqt: ${selectedTime}

✂️ *Tanlangan xizmatlar:*
${selectedServices.map(service => `- ${service.name} - ${service.price.toLocaleString()} so'm`).join('\n')}

💰 *Umumiy narx:* ${totalPrice.toLocaleString()} so'm`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        alert('Buyurtmangiz bekor qilindi.');
        resetBooking();
        hideModal('cancel-confirmation-modal');
    } catch (error) {
        console.error('Error:', error);
        alert('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
}

async function confirmCompletion() {
    if (!bookingConfirmed || !window.currentBookingId) {
        alert("Buyurtma ma'lumotlari topilmadi");
        return;
    }
    
    try {
        const db = window.firebaseDb;
        await window.firebaseDeleteDoc(window.firebaseDoc(db, "bookings", window.currentBookingId));
        
        if (bookedTimes[selectedSpecialist] && 
            bookedTimes[selectedSpecialist][selectedDate]) {
            const index = bookedTimes[selectedSpecialist][selectedDate].indexOf(selectedTime);
            if (index > -1) {
                bookedTimes[selectedSpecialist][selectedDate].splice(index, 1);
            }
        }
        
        const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
        
        const botToken = '7758261570:AAGG1bZeHVsey-xRZqACn8ZKYquYQ6UxaOA';
        const chatId = '7675613595';
        
        const message = `
✅ *Buyurtma bajarildi*

👤 *Mijoz ma'lumotlari:*
- Ism-familiya: ${userData.firstName} ${userData.lastName}
- Telefon: ${userData.phone}

💈 *Bajarilgan buyurtma ma'lumotlari:*
- Sartarosh: ${selectedSpecialist}
- Sana: ${selectedDate}
- Vaqt: ${selectedTime}

✂️ *Bajarilgan xizmatlar:*
${selectedServices.map(service => `- ${service.name} - ${service.price.toLocaleString()} so'm`).join('\n')}

💰 *Umumiy narx:* ${totalPrice.toLocaleString()} so'm`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        alert('Buyurtma muvaffaqiyatli bajarildi va vaqt bo\'shatildi!');
        resetBooking();
        hideModal('complete-confirmation-modal');
    } catch (error) {
        console.error('Error completing booking:', error);
        alert('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
}

function resetModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    document.getElementById('overlay').classList.remove('show');
    document.body.style.overflow = '';
}

function resetBooking() {
    selectedSpecialist = '';
    selectedDate = '';
    selectedTime = '';
    selectedServices = [];
    bookingConfirmed = false;
    window.currentBookingId = null;
    
    localStorage.removeItem('confirmedBooking');
    
    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary) {
        bookingSummary.classList.add('hidden');
    }
    
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.gradient-border').forEach(el => {
        if (el.id !== 'authButton') {
            el.classList.remove('gradient-border');
        }
    });
    
    const specialistsNext = document.getElementById('specialists-next');
    if (specialistsNext) specialistsNext.classList.add('hidden');
    
    const datetimeNext = document.getElementById('datetime-next');
    if (datetimeNext) datetimeNext.classList.add('hidden');
    
    const totalPriceContainer = document.getElementById('total-price-container');
    if (totalPriceContainer) totalPriceContainer.classList.add('hidden');
    
    resetModals();
}

window.showSection = showSection;
window.hideModal = hideModal;
window.selectSpecialist = selectSpecialist;
window.selectDate = selectDate;
window.selectTime = selectTime;
window.selectService = selectService;
window.showUserMenu = showUserMenu;
window.showLogoutConfirmation = showLogoutConfirmation;
window.confirmLogout = confirmLogout;
window.logout = logout;
window.confirmCancellation = confirmCancellation;
window.confirmCompletion = confirmCompletion;