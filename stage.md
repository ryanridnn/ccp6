tasks for the create page

- for the create page there a should be a toggler at the top, for schedule or manual
- put a kind of header, the header have this toggler, then separate with divider, below it is the current row for flight numbers etc
- just remove the checkbox to include the items or not to the ccp6 job in the leftest side

here is the behavior when each is selected

1. manual

- on manual, the rows should be 4 cols now, the end should render the rule set in a read only input field based on the filled data
- below the rows put a section to enter the trays / meals handled, the no of staff, and if sicc 1, meal service for food check
- keep the linked items and ad hoc as it is
- if sicc1, please add the sampled item, or services table, it is a table, with prompt of service (breakfast, lunch, and dinner), and item type (Hors, and dessert).
- Make sure there is validation logic to verify these fields for validation
- make sure all the items are being used as default value of the table

2. scheduled

- on scheduled, the only input field is the flight, and the other turns to read only text, if flight is selected the other fields is populated by default
- below the rows put a read only section to view the trays / meals handled, the no of staff, and if sicc 1, meal service for food check
- the linked items will render with destionation data prepopluated, read only as text, it should be set as preset or food check automatically
- remove the ad hoc items section
- add default service rows, dont forget to set the service and item type

basically the only input field is the flight number, and other fields and ui are read only

- make sure the value is resetted when the schedule and manual are toggled between each other
