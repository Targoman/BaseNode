import EJWT from "../src/EJWT";
import { enuTokenActorType } from "../src/EJWT/interfaces";

const jwt = EJWT.createSigned({"abcd":1}, enuTokenActorType.User, {priv:1}, 1)
console.log(jwt)
const o = EJWT.extractAndDecryptPayload(jwt)
console.log(o)