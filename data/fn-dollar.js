/* ================================================
 * HÀM Đô la :)) ĐA NĂNG TIỆN ÍCH - CÁCH SỬ DỤNG:
 * 
 * 1. Chọn phần tử:
 *    $('selector')           - querySelector
 *    $('@selector')          - querySelectorAll (trả về array)
 *    $('#id')                - getElementById
 *    $(element)              - trả về chính element nếu đã là DOM element
 * 
 * 2. Thêm sự kiện:
 *    $.on('selector', 'event', handler) - thêm event listener
 *    $.one('selector', 'event', handler) - thêm event listener chạy 1 lần
 * 
 * 3. Hỗ trợ chain method:
 *    $('selector').on('event', handler)
 *    $('selector').css('color', 'red')
 *    $('selector').addClass('active')
 * ================================================ */

const $ = function (selector, parent = document) {
    // Nếu selector là DOM element hoặc window 
    if (selector instanceof Element || selector === window) {
        return {
            element: selector,
            elements: null,
            on: function (event, handler) { this.element.addEventListener(event, handler); return this; },
            css: function (property, value) { this.element.style[property] = value; return this; },
            addClass: function (className) { this.element.classList.add(className); return this; },
            removeClass: function (className) { this.element.classList.remove(className); return this; },
            toggleClass: function (className) { this.element.classList.toggle(className); return this; }
        };
    }

    // Tạo đối tượng kết quả
    const result = {
        // Lấy phần tử
        element: null,
        elements: null,

        // Phương thức chung
        on: function (event, handler) {
            if (this.element) this.element.addEventListener(event, handler);
            if (this.elements) this.elements.forEach(el => el.addEventListener(event, handler));
            return this;
        },

        css: function (property, value) {
            if (this.element) this.element.style[property] = value;
            if (this.elements) this.elements.forEach(el => el.style[property] = value);
            return this;
        },

        addClass: function (className) {
            if (this.element) this.element.classList.add(className);
            if (this.elements) this.elements.forEach(el => el.classList.add(className));
            return this;
        },

        removeClass: function (className) {
            if (this.element) this.element.classList.remove(className);
            if (this.elements) this.elements.forEach(el => el.classList.remove(className));
            return this;
        },

        toggleClass: function (className) {
            if (this.element) this.element.classList.toggle(className);
            if (this.elements) this.elements.forEach(el => el.classList.toggle(className));
            return this;
        }
    };

    // Nếu là ID selector (bắt đầu bằng #)
    if (selector.startsWith('#')) {
        result.element = parent.getElementById(selector.slice(1));
        return result;
    }

    // Nếu muốn chọn nhiều elements (thêm @ ở đầu)
    if (selector.startsWith('@')) {
        result.elements = Array.from(parent.querySelectorAll(selector.slice(1)));
        return result;
    }

    // Mặc định dùng querySelector
    result.element = parent.querySelector(selector);
    return result;
};

// Thêm hàm tiện ích global
$.on = (selector, event, handler) => $(selector).on(event, handler);
$.one = (selector, event, handler) => {
    const onceHandler = (e) => {
        handler(e);
        $(selector).element.removeEventListener(event, onceHandler);
    };
    $(selector).on(event, onceHandler);
};