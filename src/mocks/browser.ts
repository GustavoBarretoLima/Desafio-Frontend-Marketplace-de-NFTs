import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

import { orderSocketHandler } from "./order-socket";

export const worker = setupWorker(...handlers, orderSocketHandler);
