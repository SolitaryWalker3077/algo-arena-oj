package com.oj.common.entity;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PageQueryDto {

    @NotNull(message = "每页条数不能为空")
    @Min(value = 1, message = "每页条数不能小于1")
    @Max(value = 500, message = "每页条数不能超过500")
    private Integer pageSize = 10; //每页数量 必传 给默认值为一页10条数量

    @NotNull(message = "页码不能为空")
    @Min(value = 1, message = "页码不能小于1")
    @Max(value = 1000000, message = "页码不能超过1000000")
    private Integer pageNum = 1; //第几页 必传 给默认值第一页
}
