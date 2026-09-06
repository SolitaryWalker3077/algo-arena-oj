package com.oj.common.controller;

import com.oj.common.entity.Result;

public class BaseController {
    public Result<Void> toResult(int rows) {
        return rows > 0 ? Result.success() : Result.fail();
    }

    public Result<Void> toResult(boolean result) {
        return result ? Result.success() : Result.fail();
    }
}
