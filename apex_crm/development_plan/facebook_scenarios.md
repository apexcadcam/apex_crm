# Facebook Integration: Technical Scenarios

This document outlines how the Facebook integration handles different types of incoming webhook events.

## 1. New Lead Scenario

**Condition**: Incoming phone/email does NOT match any existing Lead.
**Action**:

1. Create a new `Lead` document.
2. Set `Source` to "Facebook".
3. Populate `Smart Contact Details` with the phone/email.
4. Log an **Authentication** interaction.

## 2. Returning Lead Scenario

**Condition**: One of the incoming phone numbers matches an existing Lead (via Smart Contact logic).
**Action**:

1. **Do NOT** create a new Lead.
2. Create an `Apex Interaction Log` linked to the existing Lead.
    * **Type**: "Facebook"
    * **Direction**: "Inbound"
    * **Content**: "User interacted with Ad: [Form Name]"
3. Notify the assigned salesperson (Future feature).

## 3. Ambiguous Match Scenarios

**Condition**: Phone matches Lead A, Email matches Lead B.
**Action**:

1. Log a "Warning" system note.
2. Prioritize the **Phone Match** (Lead A).
3. Log the interaction on Lead A.
