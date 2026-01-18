// Site Switcher - Handle ?site= parameter in URL
(function() {
	'use strict';

	// Check if site parameter exists in URL
	const urlParams = new URLSearchParams(window.location.search);
	const siteParam = urlParams.get('site');

	if (siteParam) {
		// Store in localStorage for persistence
		localStorage.setItem('frappe_site', siteParam);
		
		// If we're on the login page or initial load, redirect to the correct site
		if (window.location.pathname === '/' || window.location.pathname === '/app' || window.location.pathname.startsWith('/login')) {
			// Check if site is different from current
			const currentSite = frappe?.boot?.sitename || localStorage.getItem('frappe_site');
			
			if (currentSite !== siteParam) {
				// Store site in cookie for server-side
				document.cookie = `site=${siteParam}; path=/; max-age=31536000`; // 1 year
				
				// If already logged in, reload with new site
				if (frappe?.boot?.user?.name && frappe.boot.user.name !== 'Guest') {
					// Reload to apply new site
					window.location.href = window.location.pathname + '?site=' + siteParam;
				}
			}
		}
	} else {
		// If no site param but we have one in localStorage, use it
		const storedSite = localStorage.getItem('frappe_site');
		if (storedSite && (!frappe?.boot?.sitename || frappe.boot.sitename !== storedSite)) {
			const currentPath = window.location.pathname;
			const newUrl = currentPath + (currentPath.includes('?') ? '&' : '?') + 'site=' + storedSite;
			window.location.href = newUrl;
		}
	}

	// Override frappe.set_route to preserve site parameter
	const originalSetRoute = frappe.set_route;
	frappe.set_route = function(...args) {
		const site = urlParams.get('site') || localStorage.getItem('frappe_site');
		if (site) {
			// Preserve site in all route changes
			frappe.route_options = frappe.route_options || {};
			frappe.route_options.site = site;
		}
		return originalSetRoute.apply(this, args);
	};
})();

















