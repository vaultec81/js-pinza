const ErrorCodes = {
    OKAY: 1, //Everything is alright
    InternalServerError: 2, //Error not planned for. Internal errors. Bugs etc. Do not give user feedback aside from an internal error has occured.
    ERR_Cluster_already_exists: 3,
    ERR_Cluster_does_not_exist: 4,
    ERR_Cluster_not_open: 5,
    ERR_Pin_does_not_exist: 6,
    ERR_Pin_already_exists: 7,
    ERR_missing_args: 8,
    ERR_write_denied: 9, //Used for orbitdb specific AC write rejection
    ERR_repo_not_initialized: 10,
    ERR_repo_already_initialized: 11,
    ERR_repo_locked: 12
}
module.exports = ErrorCodes;