export function generateGoldPrice() {
    const min = 2350
    const max = 2400

    const randomValue = min + Math.random() * (max - min)

    const roundedPrice = Math.round(randomValue * 100) / 100

    return roundedPrice
}