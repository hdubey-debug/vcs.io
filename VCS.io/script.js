document.addEventListener('DOMContentLoaded', function () {
    // --- Main Elements ---
    const primaryTabButtons = document.querySelectorAll('#primaryTabsNav .tab-button');
    const mainContentContainer = document.getElementById('mainContentContainer');
    const secondaryNavContainer = document.getElementById('secondaryNavContainer');
    const stickyHeader = document.querySelector('.sticky-header');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    // --- State Variables ---
    let currentStickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
    let paperNavButtons = []; // Will be populated after paper content loads
    let paperMobileMenuButton, paperSectionsNav; // Will be populated after paper content loads
    let apiNavLinks = [], apiRightPane, apiContentSections = []; // Will be populated after API content loads
    let sectionObserver, apiSectionObserver; // Observers

    // --- Helper: Check if element is in viewport ---
    function isElementInViewport(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
            rect.top < window.innerHeight && rect.bottom >= 0 &&
            rect.left < window.innerWidth && rect.right >= 0
        );
    }

    // --- Update Sticky Header Height on Resize ---
    window.addEventListener('resize', () => {
        currentStickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
        // Re-initialize observers if their rootMargins depend on this
        if (sectionObserver) setupPaperTabObserver();
        if (apiSectionObserver) setupApiTabObserver();
    });

    // --- Load Tab Content ---
    async function loadTabContent(dataSourceUrl, targetTabId) {
        try {
            const response = await fetch(dataSourceUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            mainContentContainer.innerHTML = html;

            // Re-render MathJax if it's present
            if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
                MathJax.typesetPromise([mainContentContainer]);
            }
            
            // Initialize tab-specific elements and observers
            if (targetTabId === 'paper') {
                initializePaperTabElements();
                setupPaperTabObserver();
                // Manually trigger fade-in for initially visible sections on paper tab
                 mainContentContainer.querySelectorAll('.fade-in-section').forEach(sec => {
                    if (isElementInViewport(sec)) sec.classList.add('visible');
                });
            } else if (targetTabId === 'api') {
                initializeApiTabElements();
                setupApiTabObserver();
                 mainContentContainer.querySelectorAll('.fade-in-section, .api-section-content').forEach(sec => {
                    if (isElementInViewport(sec)) sec.classList.add('visible');
                });
            } else if (targetTabId === 'example') {
                // Manually trigger fade-in for initially visible sections on example tab
                 mainContentContainer.querySelectorAll('.fade-in-section').forEach(sec => {
                    if (isElementInViewport(sec)) sec.classList.add('visible');
                });
            }


        } catch (error) {
            mainContentContainer.innerHTML = `<p class="text-red-500 text-center">Error loading content: ${error.message}. Please try again.</p>`;
            console.error("Error loading tab content:", error);
        }
    }

    // --- Primary Tab Switching Logic ---
    primaryTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tab;
            const dataSourceUrl = button.dataset.source;

            primaryTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            secondaryNavContainer.classList.toggle('hidden', targetTabId !== 'paper');
            if (targetTabId !== 'paper' && paperSectionsNav && !paperSectionsNav.classList.contains('hidden') && window.innerWidth < 768) {
                paperSectionsNav.classList.add('hidden');
                paperSectionsNav.classList.remove('md:flex');
                if (paperMobileMenuButton) paperMobileMenuButton.setAttribute('aria-expanded', 'false');
            }
            
            // Disconnect old observers before loading new content
            if (sectionObserver) sectionObserver.disconnect();
            if (apiSectionObserver) apiSectionObserver.disconnect();

            loadTabContent(dataSourceUrl, targetTabId).then(() => {
                 currentStickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 0; 
                 window.scrollTo({ top: 0, behavior: 'auto' });
            });
        });
    });

    // --- Initialize Paper Tab Specific Elements and Event Listeners ---
    function initializePaperTabElements() {
        paperNavButtons = mainContentContainer.querySelectorAll('#paperSectionsNav .nav-button'); // Assuming paperSectionsNav is part of paper.html
        // If secondaryNav is in index.html, query it from document
        const globalPaperSectionsNav = document.getElementById('paperSectionsNav');
        const globalPaperMobileMenuButton = document.getElementById('paperMobileMenuButton');


        if (globalPaperSectionsNav && globalPaperMobileMenuButton) {
            paperSectionsNav = globalPaperSectionsNav;
            paperMobileMenuButton = globalPaperMobileMenuButton;

             // --- Paper Tab: Secondary Mobile Menu Toggle ---
            paperMobileMenuButton.removeEventListener('click', togglePaperMobileMenu); // Remove previous if any
            paperMobileMenuButton.addEventListener('click', togglePaperMobileMenu);
        }
        
        // Use paperNavButtons from document as they are in the main header
        document.querySelectorAll('#secondaryNavContainer .nav-button').forEach(button => {
            button.removeEventListener('click', handlePaperNavClick); // Remove previous if any
            button.addEventListener('click', handlePaperNavClick);
        });
    }
    
    function togglePaperMobileMenu() {
        const isCurrentlyHidden = paperSectionsNav.classList.contains('hidden');
        paperSectionsNav.classList.toggle('hidden', !isCurrentlyHidden);
        paperSectionsNav.classList.toggle('md:flex', isCurrentlyHidden);
        paperMobileMenuButton.setAttribute('aria-expanded', String(isCurrentlyHidden));
    }

    function handlePaperNavClick(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href'); // e.g., "#abstract"
        const targetElement = mainContentContainer.querySelector(targetId); // Search within loaded content

        if (targetElement) {
            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - currentStickyHeaderHeight - 20;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }

        if (window.innerWidth < 768 && paperSectionsNav && !paperSectionsNav.classList.contains('hidden')) {
            paperSectionsNav.classList.add('hidden');
            paperSectionsNav.classList.remove('md:flex');
            if (paperMobileMenuButton) paperMobileMenuButton.setAttribute('aria-expanded', 'false');
        }
    }


    // --- Initialize API Tab Specific Elements and Event Listeners ---
    function initializeApiTabElements() {
        apiNavLinks = mainContentContainer.querySelectorAll('#apiNavMenu .api-nav-link');
        apiRightPane = mainContentContainer.querySelector('#apiRightPane');
        apiContentSections = mainContentContainer.querySelectorAll('#apiContent .api-section-content');

        if (apiNavLinks.length > 0 && apiRightPane) {
            apiNavLinks.forEach(link => {
                link.removeEventListener('click', handleApiNavClick); // Remove previous
                link.addEventListener('click', handleApiNavClick);
            });
            if (apiNavLinks.length > 0) {
                apiNavLinks[0].classList.add('active-api-link');
            }
        }
    }

    function handleApiNavClick(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = mainContentContainer.querySelector(`#${targetId}`);

        apiNavLinks.forEach(nav => nav.classList.remove('active-api-link'));
        this.classList.add('active-api-link');

        if (targetElement && apiRightPane) {
            const paneTop = apiRightPane.getBoundingClientRect().top;
            const targetTopInPane = targetElement.getBoundingClientRect().top;
            const isFirstElement = targetElement === apiRightPane.firstElementChild;
            const scrollOffset = isFirstElement ? 0 : 10;

            const scrollToPosition = apiRightPane.scrollTop + (targetTopInPane - paneTop) - scrollOffset;
            apiRightPane.scrollTo({
                top: scrollToPosition,
                behavior: 'smooth'
            });
        }
    }

    // --- Scroll to Top Button Functionality ---
    if (scrollToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 100) {
                if (scrollToTopBtn.style.display !== "flex") {
                    scrollToTopBtn.style.display = "flex";
                    requestAnimationFrame(() => { scrollToTopBtn.style.opacity = "1"; });
                }
            } else {
                if (scrollToTopBtn.style.opacity === "1") {
                    scrollToTopBtn.style.opacity = "0";
                    setTimeout(() => {
                        if (scrollToTopBtn.style.opacity === "0") scrollToTopBtn.style.display = "none";
                    }, 300);
                }
            }
        });
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
    }

    // --- Intersection Observer for Paper Tab Active Nav Link (Scrollspy) & Fade-in Sections ---
    function setupPaperTabObserver() {
        if (sectionObserver) sectionObserver.disconnect(); // Disconnect previous if any

        const allContentSectionsForObserver = mainContentContainer.querySelectorAll('.content-section');
        const heroSection = mainContentContainer.querySelector('#hero-section');

        const observerCallback = (entries) => {
            let latestActivePaperSectionId = null;
            let heroIsIntersecting = false;
            const activePrimaryTab = document.querySelector('#primaryTabsNav .tab-button.active');

            if (!activePrimaryTab || activePrimaryTab.dataset.tab !== 'paper') {
                 // If not on paper tab, or paper tab content not loaded, do nothing for paper scrollspy
                document.querySelectorAll('#secondaryNavContainer .nav-button').forEach(button => {
                    button.classList.remove('active');
                });
                return;
            }


            entries.forEach(entry => {
                const id = entry.target.id;
                 // Ensure we are observing elements within the currently loaded mainContentContainer
                if (!mainContentContainer.contains(entry.target)) return;


                if (entry.target.classList.contains('fade-in-section')) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                }
                
                if (entry.isIntersecting) {
                    if (entry.target.id === 'hero-section') {
                        heroIsIntersecting = true;
                    } else if (entry.target.closest('.tab-inner-content')) { // Check if it's part of the loaded content
                        if (!latestActivePaperSectionId || entry.boundingClientRect.top < mainContentContainer.querySelector(`#${latestActivePaperSectionId}`)?.getBoundingClientRect().top) {
                            if(id) latestActivePaperSectionId = id;
                        }
                    }
                }
            });

            if (secondaryNavContainer && !secondaryNavContainer.classList.contains('hidden')) {
                let activeIdToHighlight = latestActivePaperSectionId;
                
                if (heroIsIntersecting && !latestActivePaperSectionId) {
                     activeIdToHighlight = 'abstract'; 
                } else if (!activeIdToHighlight && window.pageYOffset < (heroSection ? heroSection.offsetHeight * 0.5 : 100) ) {
                    activeIdToHighlight = 'abstract'; 
                }

                document.querySelectorAll('#secondaryNavContainer .nav-button').forEach(button => {
                    const isActive = button.getAttribute('href').substring(1) === activeIdToHighlight;
                    button.classList.toggle('active', isActive);
                });
                
                if (!activeIdToHighlight && window.pageYOffset > (heroSection ? heroSection.offsetHeight * 0.5 : 100)) {
                    let closestSectionId = '';
                    let smallestDistance = Infinity;
                    mainContentContainer.querySelectorAll('.content-section').forEach(section => {
                        if (!section.id) return; 
                        const rect = section.getBoundingClientRect();
                        const distanceToStickyHeader = Math.abs(rect.top - (currentStickyHeaderHeight + 24)); 
                        
                        if (rect.top < (window.innerHeight * 0.75) && rect.bottom > (currentStickyHeaderHeight + 24) ) {
                            if (distanceToStickyHeader < smallestDistance) {
                                smallestDistance = distanceToStickyHeader;
                                closestSectionId = section.id;
                            }
                        }
                    });
                    if (closestSectionId) {
                         document.querySelectorAll('#secondaryNavContainer .nav-button').forEach(button => {
                            button.classList.toggle('active', button.getAttribute('href').substring(1) === closestSectionId);
                        });
                    }
                }
            }
        };
        
        const observerOptions = {
            root: null, 
            rootMargin: `-${currentStickyHeaderHeight + 24}px 0px -50% 0px`, 
            threshold: 0.01 
        };
        sectionObserver = new IntersectionObserver(observerCallback, observerOptions);

        if (heroSection) sectionObserver.observe(heroSection);
        allContentSectionsForObserver.forEach(section => { 
            if (section) sectionObserver.observe(section); 
        });
        
        // Initial active state for paper tab if it's loaded first
        const activePrimaryTab = document.querySelector('#primaryTabsNav .tab-button.active');
        if (activePrimaryTab && activePrimaryTab.dataset.tab === 'paper') {
             if (window.pageYOffset < (heroSection ? heroSection.offsetHeight * 0.3 : 50)) { 
                document.querySelectorAll('#secondaryNavContainer .nav-button').forEach(btn => btn.classList.remove('active'));
                const abstractButton = document.querySelector('#secondaryNavContainer .nav-button[href="#abstract"]');
                if (abstractButton) abstractButton.classList.add('active');
            }
        }
    }

    // --- Intersection Observer for API Tab ---
    function setupApiTabObserver() {
        if (apiSectionObserver) apiSectionObserver.disconnect();
        if (!apiRightPane || apiContentSections.length === 0) return;


        const apiObserverOptions = {
            root: apiRightPane, 
            rootMargin: "-20px 0px -60% 0px",
            threshold: 0.01 
        };

        let lastActiveApiLink = null;

        apiSectionObserver = new IntersectionObserver(entries => {
            const activePrimaryTab = document.querySelector('#primaryTabsNav .tab-button.active');
            if (!activePrimaryTab || activePrimaryTab.dataset.tab !== 'api') {
                return; // Only run for API tab
            }

            let bestVisibleEntry = null;
            entries.forEach(entry => {
                 if (!mainContentContainer.contains(entry.target)) return; // Ensure observing current content

                if (entry.target.classList.contains('fade-in-section') || entry.target.classList.contains('api-section-content')) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                }

                if (entry.isIntersecting) {
                    if (!bestVisibleEntry || entry.boundingClientRect.top < bestVisibleEntry.boundingClientRect.top) {
                        bestVisibleEntry = entry;
                    }
                }
            });

            if (bestVisibleEntry) {
                const id = bestVisibleEntry.target.id;
                const correspondingLink = mainContentContainer.querySelector(`.api-nav-link[href="#${id}"]`);
                if (correspondingLink && correspondingLink !== lastActiveApiLink) {
                    apiNavLinks.forEach(nav => nav.classList.remove('active-api-link'));
                    correspondingLink.classList.add('active-api-link');
                    lastActiveApiLink = correspondingLink;
                }
            } else if (!entries.some(e => e.isIntersecting) && lastActiveApiLink && apiRightPane.scrollTop === 0 && apiNavLinks.length > 0) {
                apiNavLinks.forEach(nav => nav.classList.remove('active-api-link'));
                apiNavLinks[0].classList.add('active-api-link');
                lastActiveApiLink = apiNavLinks[0];
            }
        }, apiObserverOptions);

        apiContentSections.forEach(section => {
            if(section) apiSectionObserver.observe(section);
        });
         // Initial check for API tab if it's active on load
        const activePrimaryTab = document.querySelector('#primaryTabsNav .tab-button.active');
        if (activePrimaryTab && activePrimaryTab.dataset.tab === 'api') {
            setTimeout(() => { // Allow layout to settle
                if(apiRightPane) {
                    apiRightPane.scrollTop +=1; apiRightPane.scrollTop -=1; // Trigger scroll for observer
                }
            }, 100);
        }
    }

    // --- Initial Load (Load Paper Tab by default) ---
    const initialTabButton = document.querySelector('#primaryTabsNav .tab-button.active');
    if (initialTabButton) {
        loadTabContent(initialTabButton.dataset.source, initialTabButton.dataset.tab);
    } else {
        // Fallback if no tab is active by default (should not happen with current HTML)
        const firstTabButton = document.querySelector('#primaryTabsNav .tab-button');
        if (firstTabButton) {
            firstTabButton.classList.add('active');
            loadTabContent(firstTabButton.dataset.source, firstTabButton.dataset.tab);
        }
    }
});
