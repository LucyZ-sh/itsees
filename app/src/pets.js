export const DEFAULT_PET_ID = "lop-rabbit";
export const PET_TRAVEL_STATES = ["paused", "traveling", "completed", "recalled"];
export const PET_WEATHER_STATES = ["traveling", "recalled", "paused"];
export const PET_WEATHER_TYPES = ["sunny", "rain", "fog", "snow", "wind", "heat"];

const petDefinitions = [
  { id: "teddy", name: "Q版泰迪", group: "dog", groupLabel: "狗狗" },
  { id: "corgi", name: "Q版柯基", group: "dog", groupLabel: "狗狗" },
  { id: "border-collie", name: "Q版边牧", group: "dog", groupLabel: "狗狗" },
  { id: "golden-retriever", name: "Q版金毛", group: "dog", groupLabel: "狗狗" },
  { id: "husky", name: "Q版哈士奇", group: "dog", groupLabel: "狗狗" },
  { id: "french-bulldog", name: "Q版法斗", group: "dog", groupLabel: "狗狗" },
  { id: "shiba-inu", name: "Q版柴犬", group: "dog", groupLabel: "狗狗" },
  { id: "chihuahua", name: "Q版吉娃娃", group: "dog", groupLabel: "狗狗" },
  { id: "calico-cat", name: "Q版三花猫", group: "cat", groupLabel: "猫猫" },
  { id: "abyssinian-cat", name: "Q版阿比猫", group: "cat", groupLabel: "猫猫" },
  { id: "british-blue-cat", name: "Q版蓝猫", group: "cat", groupLabel: "猫猫" },
  { id: "silver-shaded-cat", name: "Q版银渐层", group: "cat", groupLabel: "猫猫" },
  { id: "ragdoll-cat", name: "Q版布偶", group: "cat", groupLabel: "猫猫" },
  { id: "persian-cat", name: "Q版波斯猫", group: "cat", groupLabel: "猫猫" },
  { id: "sphynx-cat", name: "Q版无毛猫", group: "cat", groupLabel: "猫猫" },
  { id: "siamese-cat", name: "Q版暹罗猫", group: "cat", groupLabel: "猫猫" },
  { id: "lop-rabbit", name: "Q版垂耳兔", group: "small", groupLabel: "小动物" },
  { id: "betta-fish", name: "Q版斗鱼", group: "small", groupLabel: "小动物" },
  { id: "guinea-pig", name: "Q版荷兰猪", group: "small", groupLabel: "小动物" },
  { id: "turtle", name: "Q版乌龟", group: "small", groupLabel: "小动物" }
];

export const desktopPets = petDefinitions.map(pet => ({
  ...pet,
  asset: `./assets/pets/${pet.id}.png`,
  stateAssets: Object.fromEntries(
    PET_TRAVEL_STATES.map(state => [state, `./assets/pets/states/${pet.id}/${state}.gif`])
  ),
  weatherAssets: Object.fromEntries(
    PET_WEATHER_STATES.map(state => [
      state,
      Object.fromEntries(
        PET_WEATHER_TYPES.map(weather => [weather, `./assets/pets/weather/${pet.id}/${state}-${weather}.webp`])
      )
    ])
  )
}));

export function listPets() {
  return desktopPets;
}

export function getPetById(id) {
  return desktopPets.find(pet => pet.id === id) ?? desktopPets.find(pet => pet.id === DEFAULT_PET_ID);
}

export function getPetAssetForState(pet, state) {
  return pet?.stateAssets?.[state] ?? pet?.asset ?? getPetById(DEFAULT_PET_ID).asset;
}

export function getPetAssetForWeatherState(pet, state, weather) {
  return pet?.weatherAssets?.[state]?.[weather] ?? getPetAssetForState(pet, state);
}
