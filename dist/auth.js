"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Register endpoint
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fullName, email, password, primaryRole } = req.body;
    if (!fullName || !email || !password || !primaryRole) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(409).json({ message: 'Email already exists' });
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const user = yield prisma.user.create({
            data: { fullName, email, passwordHash, primaryRole },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'changeme');
        res.status(201).json({ user, token });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}));
// Login endpoint
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' });
    }
    try {
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ message: 'Invalid credentials' });
        const valid = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ message: 'Invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'changeme');
        res.json({ user, token });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
