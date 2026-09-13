package com.oj.common.controller;

import cn.hutool.core.collection.CollectionUtil;
import com.github.pagehelper.PageInfo;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;


import java.util.List;

public class BaseController {
    public Result<Void> toResult(int rows) {
        return rows > 0 ? Result.success() : Result.fail();
    }

    public Result<Void> toResult(boolean result) {
        return result ? Result.success() : Result.fail();
    }

    public TableDataInfo getDataTable(List<?> list) {
        if (CollectionUtil.isEmpty(list)) {
            return TableDataInfo.empty();
        }
        return TableDataInfo.success(list, new PageInfo(list).getTotal());
    }

}
