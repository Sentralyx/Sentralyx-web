// Sentralyx Trading Terminal - Main JavaScript
// Dynamic Header Loading System

document.addEventListener('DOMContentLoaded', function() {
    injectGlobalUiEnhancements();
    applyLanguagePreference();
    loadHeader();
    setActiveNavigation();
    patchLanguageSelector();
    setupBackToTop();
});

const LANGUAGE_STORAGE_KEY = 'sentralyx_lang';
const UI_STYLE_ID = 'sentralyx-ui-enhancements';
const BACK_TO_TOP_ID = 'backToTop';
const SCROLL_THRESHOLD_PX = 300;
let stickyHeaderBound = false;
let backToTopBound = false;

function injectGlobalUiEnhancements() {
    if (document.getElementById(UI_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = UI_STYLE_ID;
    style.textContent = `
        :root { --sentralyx-header-offset: 0px; }

        body { padding-top: var(--sentralyx-header-offset); }

        #main-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(10, 10, 10, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: background 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        #main-header.sx-scrolled {
            background: rgba(10, 10, 10, 0.95);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.28);
            border-bottom-color: rgba(255, 255, 255, 0.10);
        }

        #main-header .navbar { background: transparent !important; }

        .language-selector {
            position: fixed !important;
            top: 12px !important;
            right: 12px !important;
            z-index: 1105 !important;
        }

        #${BACK_TO_TOP_ID} {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 54px;
            height: 54px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.10);
            background: linear-gradient(135deg, rgba(47, 177, 127, 1), rgba(46, 204, 113, 1));
            color: #ffffff;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
            transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
            opacity: 0;
            z-index: 1100;
        }

        #${BACK_TO_TOP_ID}.show {
            display: flex;
            opacity: 1;
        }

        #${BACK_TO_TOP_ID}:hover {
            transform: translateY(-3px);
            box-shadow: 0 14px 32px rgba(47, 177, 127, 0.24);
        }

        #${BACK_TO_TOP_ID}:active { transform: translateY(-1px) scale(0.98); }

        @media (max-width: 576px) {
            #${BACK_TO_TOP_ID} { bottom: 18px; right: 18px; width: 50px; height: 50px; }
            .language-selector { top: 10px !important; right: 10px !important; }
        }
    `;
    document.head.appendChild(style);
}

function getCurrentLanguageFromPath(pathname) {
    if (pathname.startsWith('/en/')) return 'en';
    if (pathname.startsWith('/ru/')) return 'ru';
    return 'tr';
}

function normalizePath(pathname) {
    // Ensure trailing slash for directory-like module routes (e.g., /scanner)
    // and preserve file routes (e.g., /faq.html).
    if (!pathname) return '/';
    if (pathname.endsWith('.html') || pathname.endsWith('/')) return pathname;
    return pathname + '/';
}

function getLanguageRedirectTarget(desiredLang, currentPathname) {
    const pathname = normalizePath(currentPathname);

    const stripLangPrefix = (p) => {
        if (p.startsWith('/en/')) return '/' + p.slice(4);
        if (p.startsWith('/ru/')) return '/' + p.slice(4);
        return p;
    };

    const basePath = stripLangPrefix(pathname);

    // Known translated routes. Avoid redirecting to non-existent pages.
    const translated = {
        en: new Set([
            '/',
            '/faq.html',
            '/privacy.html',
            '/kvkk.html',
            '/scanner/',
            '/active-positions/',
            '/reports/',
            '/history/',
            '/strategies/',
            '/indicators/',
            '/settings/',
            '/contact/',
            '/technology.html',
        ]),
        ru: new Set([
            '/',
            '/privacy.html',
            '/faq.html',
            '/kvkk.html',
            '/scanner/',
            '/active-positions/',
            '/reports/',
            '/history/',
            '/strategies/',
            '/indicators/',
            '/settings/',
            '/contact/',
            '/technology.html',
        ]),
    };

    if (desiredLang === 'tr') {
        // Turkish lives at root (no prefix)
        return basePath;
    }

    const allow = translated[desiredLang];
    if (!allow || !allow.has(basePath)) return null;

    // Ensure home maps to /<lang>/
    if (basePath === '/') return `/${desiredLang}/`;

    // Files like /faq.html -> /en/faq.html ; directories like /scanner/ -> /en/scanner/
    return `/${desiredLang}${basePath}`;
}

function applyLanguagePreference() {
    try {
        const pathname = window.location.pathname;
        const currentLang = getCurrentLanguageFromPath(pathname);
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

        // URL prefix (/en/, /ru/) is authoritative — user picked that locale in the nav.
        if (pathname.startsWith('/en/') || pathname.startsWith('/ru/')) {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
            return;
        }

        if (!stored) {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
            return;
        }

        if (stored !== currentLang) {
            const targetPath = getLanguageRedirectTarget(stored, pathname);
            if (targetPath) {
                const target = `${targetPath}${window.location.search || ''}${window.location.hash || ''}`;
                window.location.replace(target);
            }
        }
    } catch (e) {
        // Ignore storage errors and continue without language routing.
    }
}

function langFromLinkLabel(text) {
    const label = (text || '').trim().toLowerCase();
    if (label === 'en' || label.startsWith('en')) return 'en';
    if (label === 'ru' || label.startsWith('ru')) return 'ru';
    return 'tr';
}

function patchLanguageLinks(root) {
    if (!root) return;

    const currentLang = getCurrentLanguageFromPath(window.location.pathname);
    const pathname = normalizePath(window.location.pathname);

    const stripLangPrefix = (p) => {
        if (p.startsWith('/en/')) return '/' + p.slice(4);
        if (p.startsWith('/ru/')) return '/' + p.slice(4);
        return p;
    };
    const basePath = stripLangPrefix(pathname);

    const buildHref = (lang) => {
        if (lang === 'tr') return basePath;
        const target = getLanguageRedirectTarget(lang, window.location.pathname);
        if (target) return target;
        return `/${lang}/`;
    };

    const links = root.querySelectorAll('.language-menu a, a.language-toggle');
    links.forEach((link) => {
        const lang = langFromLinkLabel(link.textContent);
        link.classList.toggle('active', lang === currentLang);
        link.setAttribute('href', buildHref(lang));
        link.addEventListener('click', () => {
            try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch (e) {}
        });
    });
}

function patchLanguageSelector() {
    const selector = document.querySelector('.language-selector');
    if (selector) patchLanguageLinks(selector);

    const buttons = selector ? selector.querySelectorAll('a.btn') : [];
    if (!buttons.length) return;

    const currentLang = getCurrentLanguageFromPath(window.location.pathname);
    const pathname = normalizePath(window.location.pathname);

    const stripLangPrefix = (p) => {
        if (p.startsWith('/en/')) return '/' + p.slice(4);
        if (p.startsWith('/ru/')) return '/' + p.slice(4);
        return p;
    };
    const basePath = stripLangPrefix(pathname);

    const buildHref = (lang) => {
        if (lang === 'tr') return basePath;
        const target = getLanguageRedirectTarget(lang, window.location.pathname);
        if (target) return target;
        return `/${lang}/`;
    };

    buttons.forEach((btn) => {
        const lang = langFromLinkLabel(btn.textContent);
        btn.classList.toggle('active', lang === currentLang);
        btn.setAttribute('href', buildHref(lang));
        btn.addEventListener('click', () => {
            try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch (e) {}
        });
    });
}

// Load header content dynamically
async function loadHeader() {
    const headerElement = document.getElementById('main-header');
    
    if (!headerElement) {
        console.error('Header element with id "main-header" not found');
        return;
    }

    try {
        const currentLang = getCurrentLanguageFromPath(window.location.pathname);
        const headerFile =
            currentLang === 'en' ? 'header-en.html' :
            currentLang === 'ru' ? 'header-ru.html' :
            'header-tr.html';

        // Determine the correct path to header.html based on current page depth
        const currentPath = window.location.pathname;
        const pathDepth = currentPath.split('/').length - 1;
        const relativePath = '../'.repeat(pathDepth) + 'assets/includes/' + headerFile;
        
        const response = await fetch(relativePath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Force UTF-8 decoding to avoid Turkish character mojibake on some hosts (e.g., when charset is omitted)
        const buffer = await response.arrayBuffer();
        const headerContent = new TextDecoder('utf-8').decode(buffer);
        headerElement.innerHTML = headerContent;
        
        // Re-initialize Bootstrap components after header load
        initializeBootstrap();

        bindStickyHeader(headerElement);
        updateHeaderOffset(headerElement);
        
        // Set active navigation
        setActiveNavigation();

        patchLanguageLinks(headerElement);
        
    } catch (error) {
        console.error('Error loading header:', error);
        // Fallback: create a simple header
        headerElement.innerHTML = `
            <nav class="navbar navbar-expand-lg sticky-top" style="background: rgba(11, 17, 27, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-color);">
                <div class="container">
                    <a class="navbar-brand d-flex align-items-center" href="/">
                        <img src="/sentralyx_logo_master.svg" alt="Sentralyx Logo" style="height: 40px; margin-right: 10px;">
                        <span class="fw-bold text-white">SENTRALYX</span>
                    </a>
                </div>
            </nav>
        `;
        bindStickyHeader(headerElement);
        updateHeaderOffset(headerElement);
    }
}

function bindStickyHeader(headerElement) {
    if (stickyHeaderBound) return;
    if (!headerElement) return;

    const onScroll = () => {
        const scrolled = window.scrollY > 8;
        headerElement.classList.toggle('sx-scrolled', scrolled);
        toggleBackToTop();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => updateHeaderOffset(headerElement), { passive: true });

    // Initialize immediately
    onScroll();
    stickyHeaderBound = true;
}

function updateHeaderOffset(headerElement) {
    try {
        if (!headerElement) return;
        const height = headerElement.getBoundingClientRect().height || 0;
        document.documentElement.style.setProperty('--sentralyx-header-offset', `${Math.ceil(height)}px`);
    } catch (e) {
        // ignore
    }
}

function setupBackToTop() {
    if (backToTopBound) return;
    ensureBackToTopButton();
    toggleBackToTop();

    // If sticky header not bound (e.g. pages without header), still track scroll for the button.
    if (!stickyHeaderBound) {
        window.addEventListener('scroll', toggleBackToTop, { passive: true });
    }

    backToTopBound = true;
}

function ensureBackToTopButton() {
    if (document.getElementById(BACK_TO_TOP_ID)) return;

    const btn = document.createElement('button');
    btn.id = BACK_TO_TOP_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.setAttribute('title', 'Back to top');
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.body.appendChild(btn);
}

function toggleBackToTop() {
    const btn = document.getElementById(BACK_TO_TOP_ID);
    if (!btn) return;
    const show = window.scrollY > SCROLL_THRESHOLD_PX;
    btn.classList.toggle('show', show);
}

// Initialize Bootstrap components after dynamic content load
function initializeBootstrap() {
    // Initialize dropdowns
    const dropdownElements = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    dropdownElements.forEach(element => {
        new bootstrap.Dropdown(element);
    });
    
    // Initialize tooltips if any
    const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipElements.forEach(element => {
        new bootstrap.Tooltip(element);
    });
}

// Set active navigation based on current page
function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    // Remove all active classes
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to current page link
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        }
    });
    
    // Special case for home page
    if (currentPage === 'index.html' && currentPath.endsWith('/site/')) {
        navLinks.forEach(link => {
            if (link.textContent.trim() === 'Ana Sayfa') {
                link.classList.add('active');
            }
        });
    }
}

// Utility function to update navigation when page changes
function updateNavigation(pageName) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    navLinks.forEach(link => {
        if (link.textContent.trim().toLowerCase() === pageName.toLowerCase()) {
            link.classList.add('active');
        }
    });
}

// Handle mobile menu toggle
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('navbar-toggler') || e.target.closest('.navbar-toggler')) {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse) {
            navbarCollapse.classList.toggle('show');
            // Add animation class for smooth transition
            navbarCollapse.style.transition = 'all 0.3s ease';
        }
    }
});

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const navbar = document.querySelector('.navbar');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const navbarToggler = document.querySelector('.navbar-toggler');
    
    if (navbarCollapse && navbarCollapse.classList.contains('show') && 
        !navbar.contains(e.target) && 
        !e.target.closest('.navbar-toggler') &&
        !e.target.closest('.navbar-collapse')) {
        navbarCollapse.classList.remove('show');
    }
});

// Close mobile menu when clicking on a nav link (for better UX)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('nav-link') && window.innerWidth < 992) {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            setTimeout(() => {
                navbarCollapse.classList.remove('show');
            }, 300); // Small delay to allow navigation to start
        }
    }
});

// Handle dropdown menus on mobile
document.addEventListener('click', function(e) {
    if (window.innerWidth < 992) {
        const dropdownToggle = e.target.closest('.dropdown-toggle');
        if (dropdownToggle) {
            e.preventDefault();
            const dropdownMenu = dropdownToggle.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                // Toggle dropdown visibility
                dropdownMenu.classList.toggle('show');
                dropdownMenu.style.position = 'static';
                dropdownMenu.style.transform = 'none';
                dropdownMenu.style.boxShadow = 'none';
                dropdownMenu.style.border = '1px solid var(--border-color)';
                dropdownMenu.style.marginTop = '10px';
                dropdownMenu.style.width = '100%';
            }
        }
    }
});

// Add mobile-specific CSS improvements
function addMobileStyles() {
    if (window.innerWidth < 992) {
        const style = document.createElement('style');
        style.textContent = `
            .navbar-collapse {
                background: var(--panel-dark) !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 8px !important;
                margin-top: 10px !important;
                padding: 15px !important;
            }
            
            .navbar-nav {
                margin: 0 !important;
            }
            
            .nav-link {
                padding: 12px 15px !important;
                margin: 5px 0 !important;
                border-radius: 6px !important;
                transition: all 0.2s ease !important;
            }
            
            .nav-link:hover {
                background: rgba(52, 152, 219, 0.1) !important;
            }
            
            .dropdown-menu {
                background: rgba(42, 49, 66, 0.5) !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 6px !important;
                margin: 10px 0 !important;
                padding: 10px !important;
            }
            
            .dropdown-item {
                padding: 10px 15px !important;
                margin: 2px 0 !important;
                border-radius: 4px !important;
            }
            
            .dropdown-item:hover {
                background: rgba(52, 152, 219, 0.2) !important;
            }
            
            .navbar-toggler {
                padding: 8px 12px !important;
                border: 1px solid var(--border-color) !important;
                border-radius: 6px !important;
            }
            
            .navbar-toggler:focus {
                box-shadow: 0 0 10px rgba(52, 152, 219, 0.3) !important;
            }
        `;
        
        // Only add the style if it doesn't exist
        if (!document.getElementById('mobile-styles')) {
            style.id = 'mobile-styles';
            document.head.appendChild(style);
        }
    }
}

// Initialize mobile styles and handle resize
window.addEventListener('load', addMobileStyles);
window.addEventListener('resize', function() {
    addMobileStyles();
    
    // Reset dropdown styles on desktop
    if (window.innerWidth >= 992) {
        const dropdownMenus = document.querySelectorAll('.dropdown-menu');
        dropdownMenus.forEach(menu => {
            menu.style.position = '';
            menu.style.transform = '';
            menu.style.boxShadow = '';
            menu.style.border = '';
            menu.style.marginTop = '';
            menu.style.width = '';
        });
    }
});
