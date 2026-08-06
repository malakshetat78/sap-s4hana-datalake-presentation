// Shared, static list of the 9 roadmap phases — used by the deck (no backend
// required) and the mobile game. Mirrors the authoritative list in server.js,
// which additionally owns scoring/CORRECT_ORDER for the live game.
window.PHASES = [
  { id: 1, title: 'Prepare SAP S/4HANA', blurb: "Get the SAP S/4HANA system ready and confirm it's set up for connectivity" },
  { id: 2, title: 'Configure SAP Integration Suite', blurb: 'Connect SAP to AWS and move data through SAP Integration Suite' },
  { id: 3, title: 'AWS Glue', blurb: 'Clean and prepare the data using AWS Glue' },
  { id: 4, title: 'AWS Glue Data Catalog', blurb: 'Organize the data into a unified, easily accessible catalog' },
  { id: 5, title: 'Amazon Athena', blurb: 'Query the data directly without complex tooling' },
  { id: 6, title: 'Amazon QuickSight', blurb: 'Build interactive dashboards to visualize the results' },
  { id: 7, title: 'Amazon SageMaker', blurb: 'Train machine learning models on the data' },
  { id: 8, title: 'Amazon Bedrock', blurb: 'Generate AI-powered insights using generative AI' },
  { id: 9, title: 'Monitoring & Production Deployment', blurb: 'Monitor the system and deploy it into a real production environment' }
];
