-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
