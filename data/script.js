// ================================================
// CODE ĐIỀU KHIỂN XE SỬ DỤNG HÀM ĐÔ LA VÍP BỜ RỒ $ :))
// ================================================

// Dark Mode Toggle
$('#darkModeToggle').on('change', function () {
    $('body').toggleClass('dark-mode');
    localStorage.setItem('darkMode', this.checked);
});

// Kiểm tra dark mode từ localStorage
if (localStorage.getItem('darkMode') === 'true') {
    $('#darkModeToggle').element.checked = true;
    $('body').addClass('dark-mode');
}

// Biến toàn cục lưu trạng thái điều khiển
const controlState = {
    throttle: 50, // Giá trị mặc định 50%
    buttonStates: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        horn: false
    },
    joystick: {
        x: 0,
        y: 0
    },
    currentMode: 'button' // 'button' hoặc 'joystick'
};

// Chuyển đổi chế độ điều khiển
$('@.mode-btn').on('click', function () {
    const mode = this.dataset.mode;
    controlState.currentMode = mode;

    // Cập nhập UI
    $('@.mode-btn').removeClass('active');
    $(this).addClass('active');

    $('@.control-container').removeClass('active');
    $(`.${mode}-mode`).addClass('active');

    // Cập nhật thông báo
    $('#currentMode').element.textContent = mode === 'button' ? 'nút bấm' : 'joystick';
    updateControlStatus();
});

// Xử lý thanh tăng tốc
const throttles = $('@.throttle');
const throttleHandles = $('@.throttle-handle');
const throttleLevels = $('@.throttle-level');
let isDragging = false;
let activeThrottle = null;

function updateThrottle(value) {
    value = Math.max(0, Math.min(100, value));
    controlState.throttle = value;
    throttleLevels.elements.forEach(level => level.style.width = `${value}%`);
    throttleHandles.elements.forEach(handle => handle.style.right = `${100 - value}%`);
    sendControlData();
}

// Click hoặc touch trên thanh: chọn vị trí bất kỳ
throttles.elements.forEach(throttle => {
    throttle.addEventListener('click', (e) => {
        const rect = throttle.getBoundingClientRect();
        updateThrottle((e.clientX - rect.left) / rect.width * 100);
    });
    throttle.addEventListener('touchstart', (e) => {
        const rect = throttle.getBoundingClientRect();
        updateThrottle((e.touches[0].clientX - rect.left) / rect.width * 100);
    });
});

// Kéo handle
throttleHandles.elements.forEach((handle, idx) => {
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        activeThrottle = throttles.elements[idx];
        e.preventDefault();
    });
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        activeThrottle = throttles.elements[idx];
        e.preventDefault();
    });
});

// Di chuyển chuột/touch khi kéo
document.addEventListener('mousemove', (e) => {
    if (!isDragging || !activeThrottle) return;
    const rect = activeThrottle.getBoundingClientRect();
    updateThrottle((e.clientX - rect.left) / rect.width * 100);
});
document.addEventListener('touchmove', (e) => {
    if (!isDragging || !activeThrottle) return;
    const rect = activeThrottle.getBoundingClientRect();
    updateThrottle((e.touches[0].clientX - rect.left) / rect.width * 100);
});

// Kết thúc kéo
document.addEventListener('mouseup', () => {
    isDragging = false;
    activeThrottle = null;
});
document.addEventListener('touchend', () => {
    isDragging = false;
    activeThrottle = null;
});
// Xử lý chế độ nút bấm
const setupButton = (btn, stateKey) => {
    const startEvents = ['mousedown', 'touchstart'];
    const endEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

    startEvents.forEach(event => {
        $(btn).on(event, (e) => {
            e.preventDefault();
            controlState.buttonStates[stateKey] = true;
            updateControlStatus();
        });
    });

    endEvents.forEach(event => {
        $(btn).on(event, (e) => {
            e.preventDefault();
            controlState.buttonStates[stateKey] = false;
            updateControlStatus();
        });
    });
};

setupButton('.forward-btn', 'forward');
setupButton('.backward-btn', 'backward');
setupButton('.left-btn', 'left');
setupButton('.right-btn', 'right');
setupButton('.horn-btn', 'horn');

// Hàm cập nhật trạng thái điều khiển
function updateControlStatus() {
    let status = '';

    if (controlState.currentMode === 'button') {
        const bs = controlState.buttonStates;

        if (bs.forward && bs.backward) status = 'Xung đột lệnh (tiến + lùi)';
        else if (bs.forward) {
            status = 'Đang tiến';
            if (bs.left) status += ' + rẽ trái';
            if (bs.right) status += ' + rẽ phải';
        }
        else if (bs.backward) {
            status = 'Đang lùi';
            if (bs.left) status += ' + rẽ trái';
            if (bs.right) status += ' + rẽ phải';
        }
        else if (bs.left && bs.right) status = 'Xung đột lệnh (trái + phải)';
        else if (bs.left) status = 'Đang rẽ trái';
        else if (bs.right) status = 'Đang rẽ phải';
        else status = 'Chưa có thao tác';

        if (bs.horn) status += status === 'Chưa có thao tác' ? 'Đang bóp còi' : ' + còi';
    } else {
        const js = controlState.joystick;
        const distance = Math.sqrt(js.x * js.x + js.y * js.y);

        if (distance < 0.2) status = 'Dừng';
        else {
            const angle = Math.atan2(js.y, js.x) * 180 / Math.PI;
            if (angle > -45 && angle < 45) status = 'Rẽ phải';
            else if (angle >= 45 && angle <= 135) status = 'Lùi';
            else if (angle > 135 || angle < -135) status = 'Rẽ trái';
            else status = 'Tiến';
        }
        status += ` (X: ${js.x.toFixed(2)}, Y: ${js.y.toFixed(2)})`;
    }

    $('#controlStatus').element.textContent = status;
    sendControlData();
}

// Hàm gửi dữ liệu điều khiển
function sendControlData() {
    const data = {
        mode: controlState.currentMode,
        throttle: controlState.throttle,
        buttons: controlState.buttonStates,
        joystick: controlState.joystick,
        timestamp: Date.now()
    };
    fetch('/control', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resp => {
         console.log('ESP32 response:', resp);
    })
    .catch(err => {
         console.log('ESP32 err:', err);
    });
}

// Xử lý joystick

const joystickHead = $('#joystickHead');
const joystickBase = document.querySelector('.joystick-mode .left-controls .joystick-base');
let activeTouchId = null;
let isMouseDown = false;

function updateJoystickDimensions() {
    if (!joystickHead.element || !joystickBase) return;
    const baseRect = joystickBase.getBoundingClientRect();
    const headRect = joystickHead.element.getBoundingClientRect();
    if (baseRect.width === 0 || headRect.width === 0) return;
    controlState.joystickBase = {
        center: {
            x: baseRect.left + baseRect.width / 2,
            y: baseRect.top + baseRect.height / 2
        },
        maxDistance: (baseRect.width - headRect.width) / 2
    };
}
window.addEventListener('resize', updateJoystickDimensions);

function initJoystick() {
    if (!joystickHead || !joystickBase) {
        console.error('Không tìm thấy joystick elements');
        return;
    }

    updateJoystickDimensions();

    joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
    document.addEventListener('touchmove', handleJoystickMove, { passive: false });
    document.addEventListener('touchend', handleJoystickEnd);
    document.addEventListener('touchcancel', handleJoystickEnd);

    joystickBase.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleJoystickStart(e) {
    e.preventDefault();
    if (activeTouchId === null) {
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        updateJoystick(touch);
    }
}

function handleJoystickMove(e) {
    e.preventDefault();
    if (activeTouchId !== null) {
        const touches = Array.from(e.touches);
        const activeTouch = touches.find(t => t.identifier === activeTouchId);
        if (activeTouch) {
            updateJoystick(activeTouch);
        }
    }
}

function handleJoystickEnd(e) {
    if (activeTouchId !== null) {
        const touches = Array.from(e.changedTouches);
        if (touches.some(t => t.identifier === activeTouchId)) {
            resetJoystick();
        }
    }
}

function handleMouseDown(e) {
    e.preventDefault();
    isMouseDown = true;
    updateJoystick(e);
}

function handleMouseMove(e) {
    e.preventDefault();
    if (isMouseDown) {
        updateJoystick(e);
    }
}

function handleMouseUp(e) {
    if (isMouseDown) {
        isMouseDown = false;
        resetJoystick();
    }
}


function updateJoystick(input) {
    if (!controlState.joystickBase) return;

    const base = controlState.joystickBase;
    let clientX, clientY;

    if (input instanceof Touch) {
        clientX = input.clientX;
        clientY = input.clientY;
    } else {
        clientX = input.clientX;
        clientY = input.clientY;
    }

    let deltaX = clientX - base.center.x;
    let deltaY = clientY - base.center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Giới hạn trong maxDistance
    if (distance > base.maxDistance) {
        const ratio = base.maxDistance / distance;
        deltaX *= ratio;
        deltaY *= ratio;
    }

    joystickHead.element.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;

    console.log("base",base.maxDistance);
    if (base.maxDistance > 0) {
        controlState.joystick.x = (deltaX / base.maxDistance);
        controlState.joystick.y = (deltaY / base.maxDistance);
            console.log('delta:', deltaX, deltaY, 'joy:', controlState.joystick.x, controlState.joystick.y);
    } else {
        controlState.joystick.x = 0;
        controlState.joystick.y = 0;
    }

    updateControlStatus();
}

function resetJoystick() {
    activeTouchId = null;
    isMouseDown = false;
    joystickHead.element.style.transform = 'translate(-50%, -50%)';
    controlState.joystick.x = 0;
    controlState.joystick.y = 0;
    updateControlStatus();
}


// Ngăn chặn menu ngữ cảnh khi chạm lâu
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

// Kiểm tra orientation khi load
function checkOrientation() {
    const warning = document.querySelector('.orientation-warning');
    if (warning) {
        warning.style.display = window.innerHeight > window.innerWidth ? 'flex' : 'none';
    }
}

$.on(window, 'load', checkOrientation);
$.on(window, 'resize', checkOrientation);

document.addEventListener('DOMContentLoaded', function () {
    initJoystick();
    checkOrientation();
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('resize', updateJoystickDimensions);

        // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const menuDropdown = document.getElementById('menuDropdown');
    
    menuToggle.addEventListener('click', function() {
        menuDropdown.classList.toggle('show');
    });
    
    // Đóng menu khi click bên ngoài
    document.addEventListener('click', function(event) {
        if (!menuToggle.contains(event.target) && !menuDropdown.contains(event.target)) {
            menuDropdown.classList.remove('show');
        }
    });
    
    // Xử lý chọn ngôn ngữ
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            langButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Thêm code xử lý thay đổi ngôn ngữ ở đây
        });
    });

    // Đảm bảo updateJoystickDimensions được gọi nhiều lần sau khi load
    let tries = 0;
    function tryUpdate() {
        updateJoystickDimensions();
        tries++;
        if (
            (!controlState.joystickBase || controlState.joystickBase.maxDistance <= 0)
            && tries < 20
        ) {
            setTimeout(tryUpdate, 100);
        }
    }
    tryUpdate();
    setTimeout(() => {
        updateThrottle(controlState.throttle);
    }, 100);
});
window.addEventListener('load', updateJoystickDimensions);