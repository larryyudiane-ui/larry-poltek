# TODO: Add Dummy Data to Graphs

1. [x] Add generateDummyData() function to js/main.js for creating sample data objects with timestamps and realistic values for pH, COD, TSS, NH3-N, Flowmeter.
2. [x] Modify fetchAndRenderUserCharts() in js/main.js: If Firebase snapshot is empty, use dummy data and setInterval to update charts every 5 seconds with new dummy points.
3. [x] Modify the admin chart data listener in initializeAdminPage(): For each user, if no data, generate and use dummy data, with periodic updates every 5 seconds.
