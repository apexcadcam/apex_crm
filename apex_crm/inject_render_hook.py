
import os
import re

js_path = "/home/frappe/frappe-bench/apps/apex_crm/apex_crm/public/js/lead_list_unified.js"

with open(js_path, "r") as f:
    content = f.read()

# Logic to inject at the end of setupLeadCardView
# We need to find the closing brace of setupLeadCardView and insert before it.
# We know setupLeadCardView starts around line 1381.
# And we know we just appended '}' to the end of the file to close it.
# So we can just replace the last '}' with our code + '}'.

override_logic = """
    // Override render to update cards on refresh
    const old_render = listview.render;
    listview.render = function() {
        if (old_render) old_render.call(listview);
        if (isMobile()) {
            renderCards();
        } else {
             // Ensure container is hidden on desktop
             if ($cardsContainer) $cardsContainer.hide();
        }
    };

    // Initial render call
    if (listview.data && listview.data.length) {
        if (isMobile()) renderCards();
    }
}
"""

# Replace the last closing brace with the logic
# We can find the last occurrence of "}"
last_brace_index = content.rfind("}")
if last_brace_index != -1:
    new_content = content[:last_brace_index] + override_logic
    
    with open(js_path, "w") as f:
        f.write(new_content)
    print("Successfully injected render override.")
else:
    print("Could not find closing brace.")
