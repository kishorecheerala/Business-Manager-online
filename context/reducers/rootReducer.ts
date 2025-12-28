import { Action } from "../AppContext";
import { AppState } from "../../types";
import { customerReducer } from "./customerReducer";
import { productReducer } from "./productReducer";
import { saleReducer } from "./saleReducer";
import { purchaseReducer } from "./purchaseReducer";
import { expenseReducer } from "./expenseReducer";
import { returnReducer } from "./returnReducer";
import { quoteReducer } from "./quoteReducer";
import { bankReducer } from "./bankReducer";
import { financialReducer } from "./financialReducer";
import { uiReducer } from "./uiReducer";
import { metadataReducer } from "./metadataReducer";
import { trashReducer } from "./trashReducer";

export const appReducer = (state: AppState, action: Action): AppState => {
    let newState = state;

    // Chain reducers. Each reducer only handles its own action types.
    newState = customerReducer(newState, action);
    newState = productReducer(newState, action);
    newState = saleReducer(newState, action);
    newState = purchaseReducer(newState, action);
    newState = expenseReducer(newState, action);
    newState = returnReducer(newState, action);
    newState = quoteReducer(newState, action);
    newState = bankReducer(newState, action);
    newState = financialReducer(newState, action);
    newState = uiReducer(newState, action);
    newState = metadataReducer(newState, action);
    newState = trashReducer(newState, action);

    return newState;
};
