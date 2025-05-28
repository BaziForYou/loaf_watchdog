---@class Config
---@field START_IF_NOT_STARTED boolean
---@field DELETE_ENTITIES boolean

---@type Config
CONFIG = json.decode(LoadResourceFile(GetCurrentResourceName(), "config.json"))

AddEventHandler("onResourceStop", function(resourceName)
    if resourceName == GetCurrentResourceName() then
        return
    end

    if not CONFIG.DELETE_ENTITIES then
        return
    end

    local entitiesToRemove = {}
    local vehicles = GetGamePool("CVehicle")
    local peds = GetGamePool("CPed")
    local objects = GetGamePool("CObject")

    for i = 1, #vehicles do
        if GetEntityScript(vehicles[i]) == resourceName then
            entitiesToRemove[#entitiesToRemove + 1] = vehicles[i]
        end
    end

    for i = 1, #peds do
        if GetEntityScript(peds[i]) == resourceName then
            entitiesToRemove[#entitiesToRemove + 1] = peds[i]
        end
    end

    for i = 1, #objects do
        if GetEntityScript(objects[i]) == resourceName then
            entitiesToRemove[#entitiesToRemove + 1] = objects[i]
        end
    end

    Wait(500)

    local deleted = false

    for i = 1, #entitiesToRemove do
        if DoesEntityExist(entitiesToRemove[i]) then
            DeleteEntity(entitiesToRemove[i])
            deleted = true
        end
    end

    if deleted then
        print(("^3[WARNING]^7: Resource ^4%s^7 did not clean up all entities"):format(resourceName))
    end
end)
