# Copyright (c) 2024, Apex Solutions and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApexInteractionLog(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		duration: DF.Duration | None
		status: DF.Literal["Attempted", "Connected", "Busy", "No Answer", "Left Message", "Scheduled", "Completed", "Answered"] | None
		summary: DF.SmallText | None
		timestamp: DF.Datetime | None
		type: DF.Literal["Call", "WhatsApp", "SMS", "Email", "Facebook", "Instagram", "LinkedIn", "Telegram", "TikTok", "Snapchat", "X", "Location", "Other"] | None
		user: DF.Link | None
	# end: auto-generated types

	pass
