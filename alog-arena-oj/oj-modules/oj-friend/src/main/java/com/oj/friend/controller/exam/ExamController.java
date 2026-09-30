package com.oj.friend.controller.exam;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.service.exam.IExamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exam")
@Tag(name = "C端竞赛")
public class ExamController extends BaseController {


    @Autowired
    private IExamService examService;

    //列表:接口地址: /exam/list
    @Operation(summary = "C端竞赛列表")
    @GetMapping("/semiLogin/list")
    public TableDataInfo list(@Validated ExamQueryDto examQueryDto) {
        return getDataTable(examService.list(examQueryDto));
    }

    @Operation(summary = "C端竞赛列表优化:引入redis")
    @GetMapping("/semiLogin/redis/list")
    public TableDataInfo RedisList(@Validated ExamQueryDto examQueryDto) {
        return examService.redisList(examQueryDto);
    }
}
