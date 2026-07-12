# Absence is an explicit row, not a missing one

The original design recorded absence as no row at all, but this made *absent* indistinguishable from *never logged* when revisiting a date. We amended it: an absent player still gets a Session row, with the Absent checkbox set and all pattern cells empty. Prefill and static-streak logic explicitly skip absent rows, so the change is transparent to the rest of the domain logic — but any future query over "sessions" must decide whether it means all rows or only attended ones.
