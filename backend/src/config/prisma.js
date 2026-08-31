const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const tenantContext = require("../utils/context");

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("sslmode=require") || process.env.NODE_ENV === "production")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

const flattenWhere = (where) => {
  if (!where) return {};
  const flat = {};
  for (const key of Object.keys(where)) {
    if (key.includes("_") && typeof where[key] === "object" && where[key] !== null && !(where[key] instanceof Date)) {
      Object.assign(flat, where[key]);
    } else {
      flat[key] = where[key];
    }
  }
  return flat;
};

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Safe check for script bypass (strictly ignored in production environment)
        const isBypass = process.env.BYPASS_TENANT_CONTEXT === "true" && process.env.NODE_ENV !== "production";
        if (isBypass) {
          return query(args);
        }

        const context = tenantContext.getStore();
        
        // List of tenant-scoped models that require schoolId isolation
        const tenantModels = [
          "User", "Admin", "Teacher", "Student", "Parent", "Department",
          "Course", "Subject", "Timetable", "Attendance", "Exam", "Mark",
          "Assignment", "AssignmentSubmission", "Fee", "Payment", "AIAnalysis", "AuditLog"
        ];

        if (tenantModels.includes(model)) {
          if (context && context.schoolId) {
            // Ensure where block exists for operations supporting filters
            if (["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "findUnique", "findUniqueOrThrow", "update", "delete", "updateMany", "deleteMany", "upsert"].includes(operation)) {
              args.where = args.where || {};
            }

            // 1. Scoped Read Operations & Bulk Mutations
            if (["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany"].includes(operation)) {
              args.where.schoolId = context.schoolId;
            } 
            // 2. Convert unique constraint lookups to scoped findFirst operations
            else if (["findUnique", "findUniqueOrThrow"].includes(operation)) {
              const flatWhere = flattenWhere(args.where);
              flatWhere.schoolId = context.schoolId;
              
              const delegate = model === "AIAnalysis" ? "aiAnalysis" : model.charAt(0).toLowerCase() + model.slice(1);
              if (operation === "findUnique") {
                return basePrisma[delegate].findFirst({
                  where: flatWhere,
                  select: args.select,
                  include: args.include,
                });
              } else {
                return basePrisma[delegate].findFirstOrThrow({
                  where: flatWhere,
                  select: args.select,
                  include: args.include,
                });
              }
            } 
            // 3. Scoped Mutation Operations (update, delete, upsert)
            else if (["update", "delete", "upsert"].includes(operation)) {
              const delegate = model === "AIAnalysis" ? "aiAnalysis" : model.charAt(0).toLowerCase() + model.slice(1);
              const flatWhere = flattenWhere(args.where);
              if (operation === "upsert") {
                const record = await basePrisma[delegate].findFirst({
                  where: flatWhere
                });
                if (record && record.schoolId !== context.schoolId) {
                  const AppError = require("../utils/AppError");
                  throw new AppError("Access denied: Resource does not belong to this school context.", 403);
                }
                args.create = args.create || {};
                args.create.schoolId = context.schoolId;
                args.update = args.update || {};
                args.update.schoolId = context.schoolId;
              } else {
                const record = await basePrisma[delegate].findFirst({
                  where: { ...flatWhere, schoolId: context.schoolId }
                });
                if (!record) {
                  const AppError = require("../utils/AppError");
                  throw new AppError("Access denied: Resource does not belong to this school context.", 403);
                }
                args.where.schoolId = context.schoolId; // Overwrite / force client scoping
              }
            } 
            // 4. Scoped Creation Operations
            else if (["create"].includes(operation)) {
              args.data = args.data || {};
              args.data.schoolId = context.schoolId;
            } 
            else if (["createMany"].includes(operation)) {
              if (Array.isArray(args.data)) {
                args.data.forEach(item => {
                  item.schoolId = context.schoolId;
                });
              } else {
                args.data = args.data || {};
                args.data.schoolId = context.schoolId;
              }
            }
          } else {
            // Fail closed if tenant context is missing.
            // Allow User query globally strictly for login credential checking or initial onboarding creation.
            const isAllowedGlobal = (model === "User" && ["findUnique", "findFirst", "findFirstOrThrow"].includes(operation)) ||
                                    (model === "User" && operation === "create" && args.data && args.data.schoolId);
            if (!isAllowedGlobal) {
              const AppError = require("../utils/AppError");
              throw new AppError("Access denied: Tenant context is missing.", 403);
            }
          }
        }
        
        return query(args);
      }
    }
  }
});

module.exports = prisma;
