# Roxiler API

## Project Description
This project provides a set of APIs to retrieve various statistics and visualizations based on sales data. The APIs include:
- Total sale amount of a selected month
- Total number of sold and unsold items of a selected month
- Bar chart data showing the distribution of items in different price ranges for the selected month
- Pie chart data showing the number of items in unique categories for the selected month
- Combined data from the above APIs

## Tech Stack
| Technology | Description                                      |
|------------|--------------------------------------------------|
| Node.js    | JavaScript runtime environment                   |
| Express.js | Web application framework for Node.js            |
| MongoDB    | NoSQL database for storing sales transactions    |

## API Endpoints Usage
### BASE URL: `https://roxiler-kjsy.onrender.com`
1. Initialize Database: `/initialize`
2. List Transactions: `/transactions`
3. Statistics: `/statistics?month=March`
4. Bar Chart: `/bar-chart?month=February`
5. Pie Chart: `/pie-chart?month=May`
6. Combined Data: `/combined?month=March`