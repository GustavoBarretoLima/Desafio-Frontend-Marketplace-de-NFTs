const basePort = Number(process.env.PLAYWRIGHT_BASE_PORT ?? 5185);
const origin = (offset: number) => "http://127.0.0.1:" + (basePort + offset);

export const scenarios = {
  normal: origin(0),
  orderTimeout: origin(1),
  stockUpdate: origin(2),
  favoritesFailure: origin(3),
};
