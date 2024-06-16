const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

app.use(cors());

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const Transaction = require('./models/Transaction');

app.get('/', (req, res) => {
  res.send(`Welcome to Roxiler API!`
          /*Use these Endpoints:
           /initialize
           /transactions
           /statistics
           /bar-chart
           /pie-chart
           /combined*/);
});

// Endpoint to initialize the database
app.get('/initialize', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    await Transaction.deleteMany({});
    await Transaction.insertMany(transactions);

    res.status(200).send('Database initialized with seed data');
  } catch (error) {
    console.error('Error initializing database:', {
      message: error.message,
      stack: error.stack,
      // Additional properties depending on the error type
      ...(error.response && { responseData: error.response.data }),
      ...(error.request && { requestData: error.request.data }),
    });
    res.status(500).send('Error initializing database');
  }
});

// Endpoint to list transactions with search and pagination
app.get('/transactions', async (req, res) => {
  const { search, page = 1, perPage = 10 } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { price: parseFloat(search) }
    ];
  }

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));
    const total = await Transaction.countDocuments(query);

    res.status(200).json({ transactions, total });
  } catch (error) {
    console.error('Error fetching transactions', error);
    res.status(500).send('Error fetching transactions');
  }
});

// Endpoint for statistics
app.get('/statistics', async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).send('Month is required');
  }

  const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

  try {
    const totalSaleAmount = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]);

    const soldItems = await Transaction.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: true
    });

    const notSoldItems = await Transaction.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: false
    });

    res.status(200).json({
      totalSaleAmount: totalSaleAmount[0]?.total || 0,
      totalSoldItems: soldItems,
      totalNotSoldItems: notSoldItems
    });
  } catch (error) {
    console.error('Error fetching statistics', error);
    res.status(500).send('Error fetching statistics');
  }
});

// Endpoint for bar chart data
app.get('/bar-chart', async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).send('Month is required');
  }

  const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

  try {
    const priceRanges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-200', min: 101, max: 200 },
      { range: '201-300', min: 201, max: 300 },
      { range: '301-400', min: 301, max: 400 },
      { range: '401-500', min: 401, max: 500 },
      { range: '501-600', min: 501, max: 600 },
      { range: '601-700', min: 601, max: 700 },
      { range: '701-800', min: 701, max: 800 },
      { range: '801-900', min: 801, max: 900 },
      { range: '901-above', min: 901, max: Infinity }
    ];

    const barChartData = await Promise.all(priceRanges.map(async (range) => {
      const count = await Transaction.countDocuments({
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        price: { $gte: range.min, $lt: range.max }
      });

      return { range: range.range, count };
    }));

    res.status(200).json(barChartData);
  } catch (error) {
    console.error('Error fetching bar chart data', error);
    res.status(500).send('Error fetching bar chart data');
  }
});

// Endpoint for pie chart data
app.get('/pie-chart', async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).send('Month is required');
  }

  const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;

  try {
    const pieChartData = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.status(200).json(pieChartData);
  } catch (error) {
    console.error('Error fetching pie chart data', error);
    res.status(500).send('Error fetching pie chart data');
  }
});

// Endpoint to combine all responses
app.get('/combined', async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).send('Month is required');
  }

  try {
    const [statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:${PORT}/statistics`, { params: { month } }),
      axios.get(`http://localhost:${PORT}/bar-chart`, { params: { month } }),
      axios.get(`http://localhost:${PORT}/pie-chart`, { params: { month } })
    ]);

    res.status(200).json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    console.error('Error fetching combined data', error);
    res.status(500).send('Error fetching combined data');
  }
});
