const logger = require("../utils/logger");
const Search = require("../models/Search");


const searchPostController = async (req, res) => {
    logger.info('Search endpoint hit!');
    try {
        const { query } = req.query;
        const cacheKey = `search`;
        const cachedSearch = await req.redisClient.get(cacheKey);
        if (cachedSearch) {
            console.log("cachedSearch", cachedSearch)
            return res.json({
                success: true,
                data: JSON.parse(cachedSearch)
            });
        }
        const results = await Search.find({
            $text: { $search: query }
        }, {
            score: { $meta: 'textScore' }
        }).sort({ score: { $meta: 'textScore' } }).limit(10);
        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(results))

        return res.json(results);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error while searching post"
        })
    }
}

module.exports = { searchPostController }