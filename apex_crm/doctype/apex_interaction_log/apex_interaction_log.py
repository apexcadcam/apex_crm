# Copyright (c) 2024, Apex Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApexInteractionLog(Document):
\t# begin: auto-generated types
\t# This code is auto-generated. Do not modify anything in this block.

\tfrom typing import TYPE_CHECKING

\tif TYPE_CHECKING:
\t\tfrom frappe.types import DF

\t\tagent: DF.Link | None
\t\tduration: DF.Duration | None
\t\tinteraction_date: DF.Datetime
\t\tinteraction_type: DF.Literal["Call", "WhatsApp", "Facebook", "Email", "Meeting", "Other"]
\t\tlead: DF.Link
\t\tnotes: DF.TextEditor | None
\t\tstatus: DF.Literal["Completed", "Attempted", "Scheduled", "Cancelled"] | None
\t\tsummary: DF.Data | None
\t# end: auto-generated types

\tpass
