(()=>{"use strict";module.exports = [
"[project]/services/api.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$21$2e$1$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/axios@1.21.1/node_modules/axios/lib/axios.js [app-ssr] (ecmascript)");
;
// 1. Crear la instancia personalizada
const api = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$21$2e$1$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: ("TURBOPACK compile-time value", "http://localhost:4001/api") || 'http://localhost:4000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
});
// 2. Interceptor de Peticiones (Request): Inyecta el token automáticamente
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return config;
}, (error)=>Promise.reject(error));
// 3. Interceptor de Respuestas (Response): Manejo centralizado de errores
api.interceptors.response.use((response)=>{
    return response;
}, (error)=>{
    if (error.response) {
        if (error.response.status === 401) {
            console.warn('Sesión expirada o no autorizada. Redirigiendo al login...');
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        } else if (error.response.status === 500) {
            console.error('Error interno del servidor.');
        }
    } else if (error.request) {
        console.error('No se pudo conectar con el servidor.');
    }
    return Promise.reject(error);
});
const __TURBOPACK__default__export__ = api;
}),
"[project]/services/auth.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchMe",
    ()=>fetchMe,
    "getCurrentUser",
    ()=>getCurrentUser,
    "login",
    ()=>login,
    "logout",
    ()=>logout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const login = async (username, password)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/auth/login', {
        username,
        password
    });
    if (data?.access_token && ("TURBOPACK compile-time value", "undefined") !== 'undefined') //TURBOPACK unreachable
    ;
    return data;
};
const fetchMe = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/auth/me');
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return data;
};
const logout = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
};
const getCurrentUser = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return null;
};
}),
"[project]/services/booklog.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createBooklog",
    ()=>createBooklog,
    "getBooklog",
    ()=>getBooklog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const getBooklog = async (date)=>{
    const params = {};
    if (date) params.date = date;
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/booklog', {
        params
    });
    return data;
};
const createBooklog = async (booklog)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/booklog', booklog);
    return data;
};
}),
"[project]/services/companies.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCompany",
    ()=>createCompany,
    "deleteCompany",
    ()=>deleteCompany,
    "listCompanies",
    ()=>listCompanies,
    "updateCompany",
    ()=>updateCompany
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const listCompanies = async (page = 1, limit = 10)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/companies', {
        params: {
            page,
            limit
        }
    });
    return data;
};
const createCompany = async (company)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/companies', company);
    return data;
};
const updateCompany = async (id, company)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/companies/${id}`, company);
    return data;
};
const deleteCompany = async (id)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].delete(`/companies/${id}`);
    return data;
};
}),
"[project]/services/profiles.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getProfiles",
    ()=>getProfiles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const getProfiles = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/profiles/findAll', {
        params: {
            limit: 100
        }
    });
    return data;
};
}),
"[project]/services/users.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deleteUser",
    ()=>deleteUser,
    "getUsers",
    ()=>getUsers,
    "listUsers",
    ()=>listUsers,
    "registerUser",
    ()=>registerUser,
    "updateUser",
    ()=>updateUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const getUsers = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/users/contacts');
    return data;
};
const listUsers = async (page = 1, limit = 10)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/users', {
        params: {
            page,
            limit
        }
    });
    return data;
};
const updateUser = async (id, user)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/users/${id}`, user);
    return data;
};
const deleteUser = async (id)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].delete(`/users/${id}`);
    return data;
};
const registerUser = async (user)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/auth/register', user);
    return data;
};
}),
"[project]/services/visitors.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "approveVisitor",
    ()=>approveVisitor,
    "checkVisitor",
    ()=>checkVisitor,
    "createVisitor",
    ()=>createVisitor,
    "deleteVisitor",
    ()=>deleteVisitor,
    "findAllByDate",
    ()=>findAllByDate,
    "getInsideQty",
    ()=>getInsideQty,
    "getLastVisitors",
    ()=>getLastVisitors,
    "getTodayQty",
    ()=>getTodayQty,
    "getTotalQty",
    ()=>getTotalQty,
    "getVisitorsReport",
    ()=>getVisitorsReport,
    "rejectVisitor",
    ()=>rejectVisitor,
    "updateVisitor",
    ()=>updateVisitor,
    "validateVisitor",
    ()=>validateVisitor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const getTotalQty = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/getTotalQty');
    return data;
};
const getTodayQty = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/getTodayQty');
    return data;
};
const getInsideQty = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/getInsideQty');
    return data;
};
const getLastVisitors = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/lastVisitors');
    return data;
};
const findAllByDate = async (startDate, endDate, page = 1, limit = 10, search, status)=>{
    const params = {
        page,
        limit
    };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (search) params.search = search;
    if (status) params.status = status;
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/findAllByDate', {
        params
    });
    return data;
};
const approveVisitor = async (id)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/visitors/${id}/approve`);
    return data;
};
const rejectVisitor = async (id, reason)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/visitors/${id}/reject`, {
        reason
    });
    return data;
};
const getVisitorsReport = async (startDate, endDate)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/report', {
        params: {
            startDate,
            endDate
        }
    });
    return data;
};
const createVisitor = async (visitor)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/visitors', visitor);
    return data;
};
const updateVisitor = async (id, visitor)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/visitors/${id}`, visitor);
    return data;
};
const deleteVisitor = async (id)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].delete(`/visitors/${id}`);
    return data;
};
const checkVisitor = async (run)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/visitors/check', {
        params: {
            run
        }
    });
    return data;
};
const validateVisitor = async (run, cardNumber)=>{
    const body = {
        run
    };
    if (cardNumber !== undefined && cardNumber !== null) body.cardNumber = cardNumber;
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put('/visitors/validate', body);
    return data;
};
}),
"[project]/services/zones.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createZone",
    ()=>createZone,
    "deleteZone",
    ()=>deleteZone,
    "getZones",
    ()=>getZones,
    "updateZone",
    ()=>updateZone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/services/api.js [app-ssr] (ecmascript)");
;
const getZones = async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/zones');
    return data;
};
const createZone = async (zone)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post('/zones', zone);
    return data;
};
const updateZone = async (id, zone)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/zones/${id}`, zone);
    return data;
};
const deleteZone = async (id)=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].delete(`/zones/${id}`);
    return data;
};
}),
];})()

//# sourceMappingURL=services_0vnd4q9kb-h_4._.js.map