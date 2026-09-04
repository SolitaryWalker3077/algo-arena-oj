package com.oj.common.controller;

import com.oj.common.entity.Result;

public class BaseController {
    public Result<Void> toR(int rows) {
        return rows > 0 ? Result.success() : Result.fail();
    }

    public Result<Void> toR(boolean result) {
        return result ? Result.success() : Result.fail();
    }
}
