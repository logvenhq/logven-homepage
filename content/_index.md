+++
title = "Logven"
template = "index.html"

# "How it works": the connectors and the company model they feed. Hues match the hero's spectrum.
[[extra.sources]]
name = "ERP"
hue = "peach"

[[extra.sources]]
name = "CRM"
hue = "pink"

[[extra.sources]]
name = "Spreadsheets"
hue = "violet"

[[extra.sources]]
name = "Email"
hue = "blue"

[[extra.sources]]
name = "Shared drives"
hue = "sky"

[[extra.sources]]
name = "PDFs and scans"
hue = "mint"

[[extra.sources]]
name = "Sensors"
hue = "sun"

[[extra.entities]]
name = "Customers"
records = "1,284"
from = ["CRM", "ERP", "Email"]
hues = ["pink", "peach", "blue"]

[[extra.entities]]
name = "Orders"
records = "48,210"
from = ["ERP", "Spreadsheets", "PDFs"]
hues = ["peach", "violet", "mint"]

[[extra.entities]]
name = "Suppliers"
records = "312"
from = ["ERP", "Email", "Shared drives"]
hues = ["peach", "blue", "sky"]

[[extra.entities]]
name = "Machines"
records = "86"
from = ["Sensors", "Spreadsheets", "PDFs"]
hues = ["sun", "violet", "mint"]

# Rendered in the FAQ section of the homepage.
[[extra.faq]]
question = "What is Logven?"
answer = "Logven gives each person simple tools for their data work. In the background, it builds one central data lake from that work."

[[extra.faq]]
question = "What’s a data lake?"
answer = "It’s one organised place for the data your teams work with. Reports, measurements, emails and spreadsheets end up clean and connected."

[[extra.faq]]
question = "How long does setup take?"
answer = "There’s no month-long setup. Each person starts on their own work right away, and the data lake grows from there."

[[extra.faq]]
question = "Can we rely on the results?"
answer = "Yes. Automations run as plain code and give the same result every time. Model steps are checked and logged, and every number traces back to its source."

[[extra.faq]]
question = "Does it get harder to maintain as it grows?"
answer = "No. Logven keeps the data lake organised as it grows, so nobody has to maintain it by hand."

[[extra.faq]]
question = "Where does it run?"
answer = "On your own servers, or in the cloud with European data residency. The models are small and private, so your data stays in your control."

[[extra.faq]]
question = "Who uses Logven day to day?"
answer = "Teams use it for their daily data work. Managers use the data lake to see what’s there and make decisions."

[[extra.faq]]
question = "What does a pilot involve?"
answer = "It’s a paid pilot on one workflow, with one team and its real data. We write the plan together and check in every week."

[[extra.faq]]
question = "How much does it cost?"
answer = "Pro is €399 a month for 15 seats. Business is €899 a month for 30 seats, plus €30 for each extra seat. Enterprise is priced with you. Prices exclude VAT, and monthly billing adds €100 a month."

[[extra.faq]]
question = "Can Logven connect to our existing tools?"
answer = "Yes. We can build custom integrations and tune the models for your field as add-ons."
+++
