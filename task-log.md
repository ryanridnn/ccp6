# Create Page Refactor Tasks

## Phase 1: UI Structure

- Add Manual/Scheduled toggler at the top of the create page [FINISHED]
- Create header layout: toggler + divider + flight number row (Flight, ETD, Group, Rule Set) [FINISHED]
- Remove checkbox column from linked items table [FINISHED]
- Add on click handler for the select or focus handler so it triggers the dropdown [FINISHED]

## Phase 2: Manual Mode

- 4 columns layout: Flight (input), ETD (input), Group (input), Rule Set (read-only) [FINISHED]
- Add Trays/Staff/Meal Service section below the header row [FINISHED]
- Keep linked items and ad hoc sections as-is [FINISHED]
- If SICC1: add services table (service type: Breakfast/Lunch/Dinner, item type: Hors/Dessert) [FINISHED]
- Add validation logic for all required fields [FINISHED]
- All linked items should be used as default values in the services table [FINISHED]

## Phase 3: Scheduled Mode

- Only Flight Number is editable input; ETD, Group, Rule Set become read-only text [FINISHED]
- Auto-populate ETD, Group, Rule Set when flight is selected [FINISHED]
- Add read-only Trays/Staff/Meal Service section below [FINISHED]
- Linked items render as read-only text with destination auto-set (preset/food check) [FINISHED]
- Hide ad hoc items section in Scheduled mode only [FINISHED]
- Add default service rows with service type and item type pre-filled, and modify the required data [FINISHED]

## Phase 4: State Management

- Reset all values when toggling between Manual and Scheduled modes [FINISHED]

- the services data grid should show only if flight no is selected [FINISHED]
- when i say read only in the schedule mode, you must render text not input, check out the styling we have in the job detail page [FINISHED]

- use better display of table, rounded with surrounding borders, [FINISHED]
- the toggle is too big, use left aligned, with no creation mode text [FINISHED]
- fix read only text, since labels are getting duplicated [FINISHED]
- services table should only show in sicc 1 not sicc 2 [FINISHED]
- only populate services in the schedle mode, not manual mode, start with empty one row service [FINISHED]

- remove the tray and no of staff from there
- lets relayout, flight number will be its own row, take half of the space, and the etd, group, rule set, and meal service will go below it, with even spacing
